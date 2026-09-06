"use client"

import { useState, useEffect } from "react"
import { type StoreApi, type UseBoundStore } from "zustand"

/**
 * SSR hydration guard for Zustand persisted stores.
 * Returns `undefined` on the server/first render, then the actual store value
 * after the client mounts — preventing hydration mismatches in Next.js.
 */
export function useStoreHydration<S, F>(
  store: UseBoundStore<StoreApi<S>>,
  selector: (state: S) => F
): F | undefined {
  const result = store(selector)
  const [hydratedValue, setHydratedValue] = useState<F | undefined>(undefined)

  useEffect(() => {
    setHydratedValue(result)
  }, [result])

  return hydratedValue
}
