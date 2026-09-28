import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { sessionQuery } from "@/lib/session";
import { saveThemePreference } from "@/features/profile/theme-sync";
import logo from "@/assets/nelson-logo.png";
import logoDark from "@/assets/nelson-logo-dark.png";

export function AppHeader() {
  const { data: session } = useQuery(sessionQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    setMenuOpen(false);
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/sign-in" });
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-foreground no-underline"
        >
          {/* Decorative: the link text names the app. Dark variant adds a light wing edge. */}
          <img src={logo} alt="" width={28} height={28} className="dark:hidden" />
          <img src={logoDark} alt="" width={28} height={28} className="hidden dark:block" />
          Nelson
        </Link>
        {session && (
          <nav aria-label="Main" className="ml-4 hidden lg:block">
            <AppNav />
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle onChange={session ? saveThemePreference : undefined} />
          {session && (
            <>
              <Button variant="outline" className="hidden lg:inline-flex" onClick={signOut}>
                Sign out
              </Button>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      className="lg:hidden"
                      aria-label="Open menu"
                    >
                      <MenuIcon aria-hidden="true" />
                    </Button>
                  }
                />
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <nav aria-label="Main" className="px-4">
                    <AppNav vertical onNavigate={() => setMenuOpen(false)} />
                  </nav>
                  <div className="px-4">
                    <Button variant="outline" className="w-full" onClick={signOut}>
                      Sign out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
