'use client'

import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query"
import React, { ReactNode } from "react"

const queryClient = new QueryClient()

export default function Providers({children}: {children: ReactNode}) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}