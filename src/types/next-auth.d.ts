import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      hasWallet: boolean;
      hasOnboarded: boolean;
      circleWalletAddress?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    hasWallet?: boolean;
    hasOnboarded?: boolean;
    circleWalletAddress?: string;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    "w3m-button": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        balance?: "show" | "hide";
        size?: "sm" | "md";
        disabled?: boolean;
      },
      HTMLElement
    >;
  }
}
