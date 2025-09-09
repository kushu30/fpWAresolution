import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
        Customer Support, Simplified.
      </h1>
      <p className="max-w-[600px] text-muted-foreground md:text-xl mb-6">
        An elegant dashboard to manage all your WhatsApp support tickets in one place.
      </p>
      <Button size="lg" onClick={onLogin}>
        Sign in with Google
      </Button>
    </div>
  );
}