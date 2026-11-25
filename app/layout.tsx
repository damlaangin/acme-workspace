import "@/styles/globals.scss";
import "react-phone-input-2/lib/style.css";
import { AuthProviderWrapper } from "@/context/providers/auth-provider-wrapper"; 
import { RouteTransitionProvider } from "@/context/providers/route-transition-provider";
import { ThemeProviderWrapper } from "@/context/providers/theme-provider";
import PoweredByFooter from "@/components/layout/powered-by-footer";
import styles from "@/styles/layout/RootLayout.module.scss";
import { DEFAULT_THEME } from "@/lib/theme";

export const metadata = {
  title: "Acme",
  description: "Acme Labs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME}>
      <body>
        <ThemeProviderWrapper>
          <AuthProviderWrapper>
            <RouteTransitionProvider>
              <div className={styles.shell}>
                <div className={styles.content}>{children}</div>
                <PoweredByFooter />
              </div>
            </RouteTransitionProvider>
          </AuthProviderWrapper>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
