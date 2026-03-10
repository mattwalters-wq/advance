"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code;

  useEffect(() => {
    if (code && typeof window !== "undefined") {
      localStorage.setItem("sl_referral", code);
    }
    router.push("/signup");
  }, [code, router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#F5F0E8", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: "#5A5A6E" }}>
        ✦
      </div>
    </div>
  );
}
