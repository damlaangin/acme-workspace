import Image from "next/image";

import styles from "@/styles/layout/PoweredByFooter.module.scss";

export default function PoweredByFooter() {
  return (
    <footer className={styles.footer}>
      <Image
        src="/poweredByAcme.svg"
        alt="Powered by Acme"
        width={221}
        height={114}
        priority
      />
    </footer>
  );
}

