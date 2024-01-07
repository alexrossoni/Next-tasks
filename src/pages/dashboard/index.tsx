import { GetServerSideProps } from 'next'
import styles from './styles.module.css'
import Head from 'next/head'
import { getSession } from 'next-auth/react'
import { Textarea } from '@/components/textarea'
import { FiShare2 } from "react-icons/fi";
import { FaTrash } from "react-icons/fa";
import { ChangeEvent, FormEvent, useState, useEffect, forwardRef } from 'react'
import { db } from '@/services/firebaseConnection'
import { addDoc, collection, query, orderBy, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore'
import Link from 'next/link'
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert';

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface DashProps {
  user: { email: string }
}

interface TaskProps {
  id: string,
  created_at: Date,
  public: boolean,
  tarefa: string,
  user: string
}

export default function Dashboard({ user }: DashProps) {
  const [ input, setInput ] = useState("");
  const [ publicTask, setPublicTask ] = useState(false);
  const [ tasks, setTasks ] = useState<TaskProps[]>([]);
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

  useEffect(() => {
    async function loadTarefas() {
      const tarefasRef = collection(db, "tasks");
      const q = query(
        tarefasRef,
        orderBy("created_at", "desc"),
        where("user", "==", user?.email)
      );

      // Observa modificações no banco em tempo real
      onSnapshot(q, (snapshot) => {
        let lista = [] as TaskProps[];

        snapshot.forEach((doc) => {
          lista.push({
            id: doc.id,
            created_at: doc.data().created_at,
            public: doc.data().public,
            tarefa: doc.data().tarefa,
            user: doc.data().user
          })

          setTasks(lista);
        })
      })
    }

    loadTarefas()
  }, [user?.email])

  function handleChangePublic(event: ChangeEvent<HTMLInputElement>) {
    setPublicTask(event.target.checked);
  }

  async function handleRegisterTask(event: FormEvent) {
    event.preventDefault();

    if (!input) {
      exibirMensagem("error", "Preencha a descrição da tarefa corretamente!");
      return
    }

    try {
      await addDoc(collection(db, 'tasks'), {
        tarefa: input,
        created_at: new Date(),
        user: user?.email,
        public: publicTask
      });

      setInput("");
      setPublicTask(false);

      exibirMensagem("success", "Task adicionada com sucesso!");
    } catch(error) {
      exibirMensagem("error", error as string);
      console.log("Error", error);
    }
  }

  async function handleShare(id: string) {
    try {
      await navigator.clipboard.writeText(
        `${process.env.NEXT_PUBLIC_URL}/task/${id}`
      )

      exibirMensagem("success", "Link copiado para área de transferência");
    } catch(error) {
      exibirMensagem("error", error as string);
      console.log("Error", error);
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      const docRef = doc(db, "tasks", id);
      await deleteDoc(docRef);

      exibirMensagem("success", "Task removida com sucesso!");
    } catch(error) {
      exibirMensagem("error", error as string);
      console.log("Error", error);
    }
  }

  return(
    <>
      <Head>
        <title>Next Tasks | Dashboard</title>
      </Head>

      <Snackbar open={openAlert} autoHideDuration={2000} onClose={handleCloseAlert} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleCloseAlert} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>

      <main className={styles.main}>
        <section className={styles.content}>
          <div className={styles.contentForm}>
            <h1 className={styles.title}>Qual sua tarefa?</h1>

            <form onSubmit={handleRegisterTask}>
              <Textarea placeholder="Digite qual sua tarefa..." value={input} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { setInput(event.target.value) }} />
              <div className={styles.checkboxArea}>
                <input id="checkboxPublic" type="checkbox" className={styles.checkbox} checked={publicTask} onChange={handleChangePublic} />
                <label htmlFor="checkboxPublic">Deixar tarefa publica?</label>
              </div>

              <button className={styles.button} type="submit">
                Registrar
              </button>
            </form>
          </div>
        </section>

        <section className={styles.taskContainer}>
          <h1>Minhas tarefas</h1>

          { tasks.map((task) => (
            <article key={task.id} className={styles.task}>
              { task.public && (
                <div className={styles.tagContainer}>
                  <label className={styles.tag}>PUBLICO</label>
                  <button className={styles.shareButton} onClick={() => { handleShare(task.id) }}>
                    <FiShare2 size={22} color="#3183ff" />
                  </button>
                </div>
              ) }

              <div className={styles.taskContent}>
                { task.public ? (
                  <Link href={`/task/${task.id}`}>
                    <p>{ task.tarefa }</p>
                  </Link>
                ) : (
                  <p>{ task.tarefa }</p>
                )}

                <button className={styles.trashButton} onClick={() => { handleDeleteTask(task.id) }}>
                  <FaTrash size={24} color="#ea3140" />
                </button>
              </div>
            </article>
          )) }
        </section>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const session = await getSession({ req });

  if (!session?.user) {
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    }
  }

  return {
    props: {
      user: {
        email: session?.user?.email
      }
    }
  }
}
