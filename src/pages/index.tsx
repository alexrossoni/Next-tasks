import Head from 'next/head'
import styles from '@/styles/home.module.css'
import Image from 'next/image'
import heroImg from '../../public/assets/hero.png'
import { collection, getDocs } from "firebase/firestore";
import { GetStaticProps } from 'next';
import { db } from "../services/firebaseConnection";

interface HomeProps {
  posts: number;
  comments: number;
}

export default function Home({ posts, comments }: HomeProps) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Next Tasks | Se organizar é o mínimo!</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.imgContent}>
          <Image className={styles.hero} alt="Imagem de tarefas" src={heroImg} priority />
        </div>

        <h1 className={styles.title}>
          Sistema feito para você organizar <br/>
          sua rotina e tarefas.
        </h1>

        <div className={styles.infoContent}>
          <section className={styles.box}>
            <span>+{posts} Tarefas</span>
          </section>

          <section className={styles.box}>
            <span>+{comments} Comentários</span>
          </section>
        </div>
      </main>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const commentRef = collection(db, "comments");
  const postRef = collection(db, "tasks");

  const commentSnapshot = await getDocs(commentRef);
  const postSnapshot = await getDocs(postRef);

  return {
    props: {
      posts: postSnapshot.size || 0,
      comments: commentSnapshot.size || 0,
    },
    revalidate: 60, // Revalidar a cada 60 segundos
  };
};
