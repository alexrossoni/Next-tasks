import Head from "next/head";
import styles from './styles.module.css'
import { GetServerSideProps } from "next";
import { db } from "@/services/firebaseConnection";
import { collection, query, where, doc, getDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { Textarea } from "../../components/textarea";
import { ChangeEvent, FormEvent, forwardRef, useState } from "react";
import { useSession } from "next-auth/react";
import { FaTrash } from "react-icons/fa";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert';

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface Task {
  item: {
    tarefa: string,
    created_at: string,
    user: string,
    public: boolean,
    id: string
  },
  allComments: Comment[]
}

interface Comment {
  id: string,
  comment: string,
  user: string,
  name: string,
  taskId: string
}

export default function Task({ item, allComments }: Task) {
  const { data: session } = useSession();
  const [ input, setInput ] = useState("");
  const [ comments, setComments ] = useState<Comment[]>(allComments || []);

  const [openAlert, setOpenAlert] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<AlertColor>("info");
  const [alertMessage, setAlertMessage] = useState("");

  const handleCloseAlert = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpenAlert(false);
  };

  function exibirMensagem(severity: AlertColor, message: string) {
    setAlertSeverity(severity);
    setAlertMessage(message);
    setOpenAlert(true);
  }

  async function handleComment(event: FormEvent) {
    event.preventDefault();

    if (!input) {
      exibirMensagem("error", "Preencha a descrição do comentário!");
      return
    }

    if (!session?.user?.email || !session?.user?.name) { return }

    try {
      const docRef = await addDoc(collection(db, "comments"), {
        comment: input,
        created_at: new Date(),
        user: session?.user?.email,
        name: session?.user?.name,
        taskId: item?.id
      });

      const data = {
        id: docRef.id,
        comment: input,
        user: session?.user?.email,
        name: session?.user?.name,
        taskId: item?.id
      };

      setComments((oldItems) => [...oldItems, data]);

      setInput("");

      exibirMensagem("success", "Comentário enviado com sucesso!");
    } catch(error) {
      exibirMensagem("error", error as string);
      console.log("Error", error);
    }
  }

  async function handleDeleteComment(id: string) {
    try {
      const docRef = doc(db, "comments", id);
      await deleteDoc(docRef);

      const deleteComment = comments.filter((item) => item.id !== id);

      setComments(deleteComment);
    } catch (err) {
      console.log(err);
    }
  }

  return(
    <div className={styles.container}>
      <Head>
        <title>Next Tasks - Task</title>
      </Head>

      <Snackbar open={openAlert} autoHideDuration={2000} onClose={handleCloseAlert} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleCloseAlert} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>

      <main className={styles.main}>
        <h1>Tarefa</h1>
        <article className={styles.task}>
          <p>{item.tarefa}</p>
        </article>
      </main>

      <section className={styles.commentsContainer}>
        <h2>Deixar comentário</h2>

        <form onSubmit={handleComment}>
          <Textarea placeholder="Digite seu comentário..." value={input} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { setInput(event.target.value) }} />
          <button className={styles.button} disabled={!session?.user}>Enviar comentário</button>
        </form>
      </section>

      <section className={styles.commentsContainer}>
        <h2>Todos comentários</h2>
        {comments.length === 0 && (
          <span>Nenhum comentário foi encontrado...</span>
        )}

        {comments.map((item) => (
          <article key={item.id} className={styles.comment}>
            <div className={styles.headComment}>
              <label className={styles.commentsLabel}>{item.name}</label>
              {item.user === session?.user?.email && (
                <button
                  className={styles.buttonTrash}
                  onClick={() => handleDeleteComment(item.id)}
                >
                  <FaTrash size={18} color="#EA3140" />
                </button>
              )}
            </div>
            <p>{item.comment}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = params?.id as string;

  const docRef = doc(db, "tasks", id);

  const snapshot = await getDoc(docRef);

  if (snapshot.data() === undefined) {
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    }
  }

  if (!snapshot.data()?.public) {
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    }
  }

  const q = query(collection(db, "comments"), where("taskId", "==", id));
  const snapshotComments = await getDocs(q);

  let allComments: Comment[] = [];

  snapshotComments.forEach((comment) => {
    allComments.push({
      id: comment.id,
      comment: comment.data().comment,
      user: comment.data().user,
      name: comment.data().name,
      taskId: comment.data().taskId
    })
  })

  const milliseconds = snapshot.data()?.created_at.seconds * 1000;

  const task = {
    tarefa: snapshot.data()?.tarefa,
    created_at: new Date(milliseconds).toLocaleDateString(),
    user: snapshot.data()?.user,
    public: snapshot.data()?.public,
    id: id,
  }

  return {
    props: {
      item: task,
      allComments: allComments
    }
  }
}