import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BorsaEgitmeni } from "@/components/BorsaEgitmeni";
import { Footer } from "@/components/Footer";

const Egitmen = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfa
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <BorsaEgitmeni />
      </main>

      <Footer />
    </div>
  );
};

export default Egitmen;
