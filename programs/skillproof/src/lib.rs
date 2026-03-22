use anchor_lang::prelude::*;

declare_id!("3zhshhVRmnVyTio5rXHindxv9MGBR3aFtFgWLH7wNi6C");

const USER_SEED: &[u8] = b"user";
const PROJECT_SEED: &[u8] = b"project";
const VALIDATION_SEED: &[u8] = b"validation";
const BADGE_SEED: &[u8] = b"badge";
const PROPOSAL_SEED: &[u8] = b"proposal";
const VOTE_SEED: &[u8] = b"vote";
const MENTORING_SEED: &[u8] = b"mentoring";
const MENTORING_BADGE_SEED: &[u8] = b"mentoring_badge";

#[program]
pub mod skillproof {
    use super::*;

    pub fn register_user(
        ctx: Context<RegisterUser>,
        display_name: String,
        bio: String,
    ) -> Result<()> {
        require!(display_name.len() <= 48, SkillProofError::TextoMuyLargo);
        require!(bio.len() <= 160, SkillProofError::TextoMuyLargo);

        let user = &mut ctx.accounts.user_account;
        user.authority = ctx.accounts.authority.key();
        user.display_name = display_name;
        user.bio = bio;
        user.score = 0;
        user.level = 0;
        user.successful_projects = 0;
        user.validations_count = 0;
        user.successful_mentorships = 0;
        user.bump = ctx.bumps.user_account;
        Ok(())
    }

    pub fn update_nivel(ctx: Context<UpdateNivel>) -> Result<()> {
        let user = &mut ctx.accounts.user_account;
        user.level = level_from_score(user.score);
        Ok(())
    }

    pub fn submit_project(
        ctx: Context<SubmitProject>,
        project_name: String,
        area: SkillArea,
        description: String,
        evidence_uri: String,
    ) -> Result<()> {
        require!(project_name.len() <= 64, SkillProofError::TextoMuyLargo);
        require!(description.len() <= 280, SkillProofError::TextoMuyLargo);
        require!(evidence_uri.len() <= 200, SkillProofError::TextoMuyLargo);

        let project = &mut ctx.accounts.project_account;
        project.author = ctx.accounts.authority.key();
        project.user = ctx.accounts.user_account.key();
        project.project_name = project_name;
        project.area = area;
        project.description = description;
        project.evidence_uri = evidence_uri;
        project.status = ProjectStatus::Pendiente;
        project.created_at = Clock::get()?.unix_timestamp;
        project.positive_validations = 0;
        project.negative_validations = 0;
        project.bump = ctx.bumps.project_account;
        Ok(())
    }

    pub fn validate_project(
        ctx: Context<ValidateProject>,
        approved: bool,
        rejection_category: Option<RejectionCategory>,
        feedback: String,
    ) -> Result<()> {
        require!(feedback.len() <= 200, SkillProofError::TextoMuyLargo);

        let validator = &mut ctx.accounts.validator_user;
        let project = &mut ctx.accounts.project_account;
        let validation = &mut ctx.accounts.validation_account;

        require!(validator.score >= 50, SkillProofError::ScoreInsuficiente);
        require!(
            project.status == ProjectStatus::Pendiente,
            SkillProofError::ProyectoNoEstaPendiente
        );
        require!(
            validator.authority != project.author,
            SkillProofError::NoPuedesValidarTuPropio
        );

        if !approved {
            require!(
                rejection_category.is_some(),
                SkillProofError::CategoriaRequerida
            );
        }

        validation.validator = ctx.accounts.validator.key();
        validation.validator_user = validator.key();
        validation.project = project.key();
        validation.approved = approved;
        validation.rejection_category = rejection_category;
        validation.feedback = feedback;
        validation.created_at = Clock::get()?.unix_timestamp;
        validation.bump = ctx.bumps.validation_account;

        if approved {
            project.positive_validations = project.positive_validations.saturating_add(1);
            validator.score = validator.score.saturating_add(2);
            validator.validations_count = validator.validations_count.saturating_add(1);
        } else {
            project.negative_validations = project.negative_validations.saturating_add(1);
            project.status = ProjectStatus::Rechazado;
        }

        validator.level = level_from_score(validator.score);
        Ok(())
    }

    pub fn check_project_approval(ctx: Context<CheckProjectApproval>) -> Result<()> {
        let project = &mut ctx.accounts.project_account;
        let author = &mut ctx.accounts.author_user;

        require!(
            project.status == ProjectStatus::Pendiente,
            SkillProofError::ProyectoNoEstaPendiente
        );

        let now = Clock::get()?.unix_timestamp;
        let elapsed = now.saturating_sub(project.created_at);
        let enough_votes = project.positive_validations >= 3;
        let enough_time = project.positive_validations >= 2 && elapsed >= 48 * 60 * 60;

        if enough_votes || enough_time {
            project.status = ProjectStatus::Aprobado;
            author.score = author.score.saturating_add(1);
            author.successful_projects = author.successful_projects.saturating_add(1);
            author.level = level_from_score(author.score);
            Ok(())
        } else {
            err!(SkillProofError::AprobacionAunNoDisponible)
        }
    }

    pub fn mint_skill_badge(
        ctx: Context<MintSkillBadge>,
        badge_name: String,
        metadata_uri: String,
    ) -> Result<()> {
        require!(badge_name.len() <= 64, SkillProofError::TextoMuyLargo);
        require!(metadata_uri.len() <= 200, SkillProofError::TextoMuyLargo);

        let project = &ctx.accounts.project_account;
        let badge = &mut ctx.accounts.badge_account;
        let author = &ctx.accounts.author_user;

        require!(
            project.status == ProjectStatus::Aprobado,
            SkillProofError::ProyectoNoAprobado
        );

        badge.owner = ctx.accounts.authority.key();
        badge.project = project.key();
        badge.badge_name = badge_name;
        badge.area = project.area.clone();
        badge.metadata_uri = metadata_uri;
        badge.score_snapshot = author.score;
        badge.soulbound = true;
        badge.bump = ctx.bumps.badge_account;
        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
    ) -> Result<()> {
        require!(title.len() <= 80, SkillProofError::TextoMuyLargo);
        require!(description.len() <= 280, SkillProofError::TextoMuyLargo);

        let author = &ctx.accounts.author_user;
        require!(author.level >= 2, SkillProofError::NivelInsuficiente);

        let proposal = &mut ctx.accounts.proposal_account;
        proposal.authority = ctx.accounts.authority.key();
        proposal.author_user = author.key();
        proposal.title = title;
        proposal.description = description;
        proposal.total_yes_weight = 0;
        proposal.total_no_weight = 0;
        proposal.active = true;
        proposal.created_at = Clock::get()?.unix_timestamp;
        proposal.bump = ctx.bumps.proposal_account;
        Ok(())
    }

    pub fn cast_vote(ctx: Context<CastVote>, support: bool) -> Result<()> {
        let voter = &ctx.accounts.voter_user;
        let proposal = &mut ctx.accounts.proposal_account;
        let vote = &mut ctx.accounts.vote_account;

        require!(voter.score >= 10, SkillProofError::ScoreInsuficienteParaVotar);
        require!(proposal.active, SkillProofError::PropuestaInactiva);

        let weight = voter.score;
        vote.proposal = proposal.key();
        vote.voter = ctx.accounts.voter.key();
        vote.weight = weight;
        vote.support = support;
        vote.bump = ctx.bumps.vote_account;

        if support {
            proposal.total_yes_weight = proposal.total_yes_weight.saturating_add(weight);
        } else {
            proposal.total_no_weight = proposal.total_no_weight.saturating_add(weight);
        }

        Ok(())
    }

    pub fn close_proposal(ctx: Context<CloseProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal_account;
        require!(proposal.authority == ctx.accounts.authority.key(), SkillProofError::NoEresElAutor);
        proposal.active = false;
        Ok(())
    }

    pub fn request_mentoring(
        ctx: Context<RequestMentoring>,
        notes: String,
    ) -> Result<()> {
        require!(notes.len() <= 200, SkillProofError::TextoMuyLargo);
        require!(
            ctx.accounts.project_account.status == ProjectStatus::Rechazado,
            SkillProofError::ProyectoNoRechazado
        );
        require!(
            ctx.accounts.mentor_user.level >= 3,
            SkillProofError::MentorSinNivel
        );

        let mentoring = &mut ctx.accounts.mentoring_account;
        mentoring.project = ctx.accounts.project_account.key();
        mentoring.mentee = ctx.accounts.mentee.key();
        mentoring.mentor = ctx.accounts.mentor.key();
        mentoring.active = true;
        mentoring.notes = notes;
        mentoring.bump = ctx.bumps.mentoring_account;
        Ok(())
    }

    pub fn complete_mentoring(ctx: Context<CompleteMentoring>) -> Result<()> {
        require!(
            ctx.accounts.project_account.status == ProjectStatus::Aprobado,
            SkillProofError::ProyectoNoAprobado
        );

        let mentoring = &mut ctx.accounts.mentoring_account;
        let mentor = &mut ctx.accounts.mentor_user;
        let badge = &mut ctx.accounts.mentoring_badge;

        mentoring.active = false;
        mentor.score = mentor.score.saturating_add(5);
        mentor.successful_mentorships = mentor.successful_mentorships.saturating_add(1);
        mentor.level = level_from_score(mentor.score);

        if badge.mentor == Pubkey::default() {
            badge.mentor = ctx.accounts.mentor.key();
            badge.successful_mentorships = 0;
            badge.bump = ctx.bumps.mentoring_badge;
        }

        badge.successful_mentorships = badge.successful_mentorships.saturating_add(1);
        Ok(())
    }
}

fn level_from_score(score: u64) -> u8 {
    match score {
        0..=9 => 0,
        10..=49 => 1,
        50..=99 => 2,
        _ => 3,
    }
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = UserAccount::INIT_SPACE,
        seeds = [USER_SEED, authority.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateNivel<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [USER_SEED, authority.key().as_ref()],
        bump = user_account.bump,
        has_one = authority
    )]
    pub user_account: Account<'info, UserAccount>,
}

#[derive(Accounts)]
#[instruction(project_name: String)]
pub struct SubmitProject<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [USER_SEED, authority.key().as_ref()],
        bump = user_account.bump,
        has_one = authority
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(
        init,
        payer = authority,
        space = ProjectAccount::INIT_SPACE,
        seeds = [PROJECT_SEED, authority.key().as_ref(), project_name.as_bytes()],
        bump
    )]
    pub project_account: Account<'info, ProjectAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateProject<'info> {
    #[account(mut)]
    pub validator: Signer<'info>,
    #[account(
        mut,
        seeds = [USER_SEED, validator.key().as_ref()],
        bump = validator_user.bump,
        constraint = validator_user.authority == validator.key() @ SkillProofError::NoEresElAutor
    )]
    pub validator_user: Account<'info, UserAccount>,
    #[account(mut)]
    pub project_account: Account<'info, ProjectAccount>,
    #[account(
        init,
        payer = validator,
        space = ValidationAccount::INIT_SPACE,
        seeds = [VALIDATION_SEED, validator.key().as_ref(), project_account.key().as_ref()],
        bump
    )]
    pub validation_account: Account<'info, ValidationAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckProjectApproval<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub project_account: Account<'info, ProjectAccount>,
    #[account(
        mut,
        seeds = [USER_SEED, project_account.author.as_ref()],
        bump = author_user.bump
    )]
    pub author_user: Account<'info, UserAccount>,
}

#[derive(Accounts)]
pub struct MintSkillBadge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [USER_SEED, authority.key().as_ref()],
        bump = author_user.bump,
        has_one = authority
    )]
    pub author_user: Account<'info, UserAccount>,
    #[account(mut, constraint = project_account.author == authority.key() @ SkillProofError::NoEresElAutor)]
    pub project_account: Account<'info, ProjectAccount>,
    #[account(
        init,
        payer = authority,
        space = BadgeAccount::INIT_SPACE,
        seeds = [BADGE_SEED, authority.key().as_ref(), project_account.key().as_ref()],
        bump
    )]
    pub badge_account: Account<'info, BadgeAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [USER_SEED, authority.key().as_ref()],
        bump = author_user.bump,
        has_one = authority
    )]
    pub author_user: Account<'info, UserAccount>,
    #[account(
        init,
        payer = authority,
        space = ProposalAccount::INIT_SPACE,
        seeds = [PROPOSAL_SEED, authority.key().as_ref(), title.as_bytes()],
        bump
    )]
    pub proposal_account: Account<'info, ProposalAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(
        seeds = [USER_SEED, voter.key().as_ref()],
        bump = voter_user.bump,
        constraint = voter_user.authority == voter.key() @ SkillProofError::NoEresElAutor
    )]
    pub voter_user: Account<'info, UserAccount>,
    #[account(mut)]
    pub proposal_account: Account<'info, ProposalAccount>,
    #[account(
        init,
        payer = voter,
        space = VoteAccount::INIT_SPACE,
        seeds = [VOTE_SEED, voter.key().as_ref(), proposal_account.key().as_ref()],
        bump
    )]
    pub vote_account: Account<'info, VoteAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseProposal<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub proposal_account: Account<'info, ProposalAccount>,
}

#[derive(Accounts)]
pub struct RequestMentoring<'info> {
    #[account(mut)]
    pub mentee: Signer<'info>,
    pub mentor: UncheckedAccount<'info>,
    #[account(
        seeds = [USER_SEED, mentee.key().as_ref()],
        bump = mentee_user.bump,
        constraint = mentee_user.authority == mentee.key() @ SkillProofError::NoEresElAutor
    )]
    pub mentee_user: Account<'info, UserAccount>,
    #[account(
        seeds = [USER_SEED, mentor.key().as_ref()],
        bump = mentor_user.bump
    )]
    pub mentor_user: Account<'info, UserAccount>,
    #[account(mut)]
    pub project_account: Account<'info, ProjectAccount>,
    #[account(
        init,
        payer = mentee,
        space = MentoringAccount::INIT_SPACE,
        seeds = [MENTORING_SEED, mentee.key().as_ref(), project_account.key().as_ref()],
        bump
    )]
    pub mentoring_account: Account<'info, MentoringAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteMentoring<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mentor: UncheckedAccount<'info>,
    #[account(mut)]
    pub project_account: Account<'info, ProjectAccount>,
    #[account(mut)]
    pub mentoring_account: Account<'info, MentoringAccount>,
    #[account(
        mut,
        seeds = [USER_SEED, mentor.key().as_ref()],
        bump = mentor_user.bump
    )]
    pub mentor_user: Account<'info, UserAccount>,
    #[account(
        init_if_needed,
        payer = authority,
        space = MentoringBadge::INIT_SPACE,
        seeds = [MENTORING_BADGE_SEED, mentor.key().as_ref()],
        bump
    )]
    pub mentoring_badge: Account<'info, MentoringBadge>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub authority: Pubkey,
    #[max_len(48)]
    pub display_name: String,
    #[max_len(160)]
    pub bio: String,
    pub score: u64,
    pub level: u8,
    pub successful_projects: u32,
    pub validations_count: u32,
    pub successful_mentorships: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProjectAccount {
    pub author: Pubkey,
    pub user: Pubkey,
    #[max_len(64)]
    pub project_name: String,
    pub area: SkillArea,
    #[max_len(280)]
    pub description: String,
    #[max_len(200)]
    pub evidence_uri: String,
    pub status: ProjectStatus,
    pub created_at: i64,
    pub positive_validations: u8,
    pub negative_validations: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ValidationAccount {
    pub validator: Pubkey,
    pub validator_user: Pubkey,
    pub project: Pubkey,
    pub approved: bool,
    pub rejection_category: Option<RejectionCategory>,
    #[max_len(200)]
    pub feedback: String,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BadgeAccount {
    pub owner: Pubkey,
    pub project: Pubkey,
    #[max_len(64)]
    pub badge_name: String,
    pub area: SkillArea,
    #[max_len(200)]
    pub metadata_uri: String,
    pub score_snapshot: u64,
    pub soulbound: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProposalAccount {
    pub authority: Pubkey,
    pub author_user: Pubkey,
    #[max_len(80)]
    pub title: String,
    #[max_len(280)]
    pub description: String,
    pub total_yes_weight: u64,
    pub total_no_weight: u64,
    pub active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteAccount {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub weight: u64,
    pub support: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MentoringAccount {
    pub project: Pubkey,
    pub mentee: Pubkey,
    pub mentor: Pubkey,
    pub active: bool,
    #[max_len(200)]
    pub notes: String,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MentoringBadge {
    pub mentor: Pubkey,
    pub successful_mentorships: u32,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Eq)]
pub enum ProjectStatus {
    Pendiente,
    Aprobado,
    Rechazado,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum SkillArea {
    Frontend,
    Backend,
    Rust,
    Diseno,
    Comunidad,
    Liderazgo,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum RejectionCategory {
    EvidenciaInsuficiente,
    ProyectoIncompleto,
    NoCorrespondeAlArea,
}

#[error_code]
pub enum SkillProofError {
    #[msg("No tienes score suficiente para validar")]
    ScoreInsuficiente,
    #[msg("Necesitas al menos 10 puntos para votar")]
    ScoreInsuficienteParaVotar,
    #[msg("No puedes aprobar tu propio proyecto")]
    NoPuedesValidarTuPropio,
    #[msg("El proyecto ya fue procesado")]
    ProyectoNoEstaPendiente,
    #[msg("El proyecto aun no esta aprobado")]
    ProyectoNoAprobado,
    #[msg("Solo proyectos rechazados pueden pedir mentoria")]
    ProyectoNoRechazado,
    #[msg("Al rechazar debes elegir una categoria")]
    CategoriaRequerida,
    #[msg("La propuesta ya esta cerrada")]
    PropuestaInactiva,
    #[msg("Solo el autor puede realizar esta accion")]
    NoEresElAutor,
    #[msg("El mentor necesita nivel 3")]
    MentorSinNivel,
    #[msg("No tienes nivel suficiente para crear propuestas")]
    NivelInsuficiente,
    #[msg("La aprobacion automatica aun no aplica")]
    AprobacionAunNoDisponible,
    #[msg("Texto excede el maximo permitido")]
    TextoMuyLargo,
}
