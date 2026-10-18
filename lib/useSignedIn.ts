"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** null while the session is being read, then true or false. */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(!!session?.user),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return signedIn;
}
