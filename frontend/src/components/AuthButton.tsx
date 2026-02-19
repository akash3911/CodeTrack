import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { onAuthChange, signInWithGoogle, signOutUser } from "@/lib/auth";
import { User } from "firebase/auth";

type AuthButtonProps = {
  className?: string;
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive" | "link";
};

const AuthButton = ({ className, variant = "ghost" }: AuthButtonProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onAuthChange(setUser);
  }, []);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOutUser();
    } finally {
      setBusy(false);
    }
  };

  return user ? (
    <Button variant={variant} className={className} onClick={handleSignOut} disabled={busy}>
      Sign out
    </Button>
  ) : (
    <Button variant={variant} className={className} onClick={handleSignIn} disabled={busy}>
      Sign in with Google
    </Button>
  );
};

export default AuthButton;
