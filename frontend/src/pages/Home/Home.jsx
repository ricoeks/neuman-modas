import Button from "../../components/Button/Button";
import "./Home.css";

function Home() {
  return (
    <main className="home">
      <section className="hero">
        <span className="hero__version">
          Projeto Atlas • v0.0.1
        </span>

        <h1 className="hero__title">
          Neumam <span>Modas</span>
        </h1>

        <p className="hero__slogan">
          Seu estilo, sua escolha.
        </p>

        <Button disabled>
          Em breve
        </Button>
      </section>
    </main>
  );
}

export default Home;