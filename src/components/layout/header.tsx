"use client";

import { AuthButton } from "@/components/auth/auth-button";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Mudanzify</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Organiza tu futura propiedad
          </span>
        </div>
        
        <AuthButton />
      </div>
    </header>
  );
}
