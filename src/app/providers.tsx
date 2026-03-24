'use client'

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import bs58 from 'bs58'
import { api, type AuthUser } from '../lib/api'
import '@solana/wallet-adapter-react-ui/styles.css'

export type SolanaCluster = 'devnet' | 'testnet'

const CLUSTER_ENDPOINTS: Record<SolanaCluster, string> = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

const SolanaNetworkContext = createContext<{
  network: SolanaCluster
  endpoint: string
  setNetwork: (next: SolanaCluster) => void
}>({
  network: 'devnet',
  endpoint: CLUSTER_ENDPOINTS.devnet,
  setNetwork: () => undefined,
})

const TOKEN_KEY = 'skillproof_auth_token'

const AuthSessionContext = createContext<{
  token: string | null
  user: AuthUser | null
  loading: boolean
  registerWithPassword: (payload: { email: string; password: string; displayName: string }) => Promise<void>
  loginWithPassword: (payload: { email: string; password: string }) => Promise<void>
  loginWithWallet: (payload: {
    wallet: string
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
    displayName?: string
  }) => Promise<void>
  logout: () => void
}>({
  token: null,
  user: null,
  loading: true,
  registerWithPassword: async () => undefined,
  loginWithPassword: async () => undefined,
  loginWithWallet: async () => undefined,
  logout: () => undefined,
})

export function useSolanaNetwork() {
  return useContext(SolanaNetworkContext)
}

export function useAuthSession() {
  return useContext(AuthSessionContext)
}

export function Providers({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<SolanaCluster>('devnet')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const endpoint = CLUSTER_ENDPOINTS[network]

  useEffect(() => {
    const saved = window.localStorage.getItem('skillproof_cluster')
    if (saved === 'devnet' || saved === 'testnet') {
      setNetwork(saved)
    }
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_KEY)
    if (!saved) {
      setLoading(false)
      return
    }
    setToken(saved)
    void api
      .authMe(saved)
      .then((result) => {
        setUser(result.user)
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  function updateNetwork(next: SolanaCluster) {
    setNetwork(next)
    window.localStorage.setItem('skillproof_cluster', next)
  }

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  )

  function persistSession(nextToken: string, nextUser: AuthUser) {
    window.localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
  }

  async function registerWithPassword(payload: {
    email: string
    password: string
    displayName: string
  }) {
    const result = await api.authRegister(payload)
    persistSession(result.token, result.user)
  }

  async function loginWithPassword(payload: { email: string; password: string }) {
    const result = await api.authLogin(payload)
    persistSession(result.token, result.user)
  }

  async function loginWithWallet(payload: {
    wallet: string
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
    displayName?: string
  }) {
    const nonceResponse = await api.authSolanaNonce({ wallet: payload.wallet })
    const messageBytes = new TextEncoder().encode(nonceResponse.message)
    const signature = await payload.signMessage(messageBytes)
    const signatureBase58 = bs58.encode(signature)
    const result = await api.authSolanaVerify({
      wallet: payload.wallet,
      nonce: nonceResponse.nonce,
      signature: signatureBase58,
      displayName: payload.displayName,
    })
    persistSession(result.token, result.user)
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthSessionContext.Provider
      value={{
        token,
        user,
        loading,
        registerWithPassword,
        loginWithPassword,
        loginWithWallet,
        logout,
      }}
    >
      <SolanaNetworkContext.Provider
        value={{ network, endpoint, setNetwork: updateNetwork }}
      >
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>{children}</WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </SolanaNetworkContext.Provider>
    </AuthSessionContext.Provider>
  )
}
