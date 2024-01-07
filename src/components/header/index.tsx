import styles from "./styles.module.css";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className={styles.header}>
      <section className={styles.content}>
        <nav className={styles.nav}>
          <Link href="/">
            <h1 className={styles.logo}>
              Nex<span>T</span>
            </h1>
          </Link>
        </nav>

        <div className={styles.buttonsContainer}>
          { session?.user && (
            <Link href="/dashboard" className={styles.link}>
              Meu Painel
            </Link>
          ) }

          { status === 'loading' ? (
            <></>
          ) : session ? (
            <button className={styles.loginButton} onClick={ () => signOut() }>
              Olá {session?.user?.name}
            </button>
          ) : (
            <button className={styles.loginButton} onClick={ () => signIn("google") }>
              Acessar
            </button>
          )}
        </div>
      </section>
    </header>
  );
}
