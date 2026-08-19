import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/integritet")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="relative">
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <div className="mb-6 flex items-center gap-2">
          <span className="mono text-xs uppercase tracking-widest text-accent">// integritet</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <h1 className="text-3xl font-extrabold sm:text-4xl">Integritet och personuppgifter</h1>

        <div className="mt-8 space-y-7 rounded-2xl border border-border bg-card p-6 shadow-panel sm:p-8">
          <p className="text-muted-foreground">
            <strong className="text-foreground">CheckIn MakeOn</strong> är ett frivilligt system som drivs av{" "}
            <strong className="text-foreground">Sundsvall Makers</strong> för att uppmuntra besök på MakeOn och andra organiserade aktiviteter.
          </p>

          <section>
            <h2 className="text-xl font-bold">Att delta i CheckIn MakeOn</h2>
            <p className="mt-2 text-muted-foreground">
              Du deltar frivilligt genom att själv be en administratör att lägga till dig i systemet. För att registrera dig behöver vi ditt namn och medlemsnummer.
            </p>
            <p className="mt-2 text-muted-foreground">
              När du sedan väljer att checka in vid en aktivitet registreras ditt deltagande. Incheckningarna används för att beräkna den publika topplistan och eventuella aktivitetsutmärkelser, exempelvis FixIt-stjärnor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Vad visas offentligt?</h2>
            <p className="mt-2 text-muted-foreground">
              På topplistan visas ditt namn, ditt sammanräknade antal registrerade besök och eventuella aktivitetsutmärkelser. Ditt medlemsnummer och din detaljerade närvarohistorik visas inte offentligt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Varför behandlar vi uppgifterna?</h2>
            <p className="mt-2 text-muted-foreground">
              Syftet med CheckIn MakeOn är att på ett frivilligt och lekfullt sätt uppmuntra deltagande i Sundsvall Makers aktiviteter. Uppgifterna i systemet används inte för andra ändamål.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Rättslig grund</h2>
            <p className="mt-2 text-muted-foreground">
              Behandlingen bygger på ditt samtycke till att delta i CheckIn MakeOn. Innan du läggs till ska du ha fått information om hur systemet fungerar och att deltagandet innebär att uppgifter visas på den publika topplistan.
            </p>
            <p className="mt-2 text-muted-foreground">
              Du kan när som helst återkalla ditt samtycke och be att bli borttagen från CheckIn MakeOn. Det påverkar inte ditt medlemskap i Sundsvall Makers eller din möjlighet att delta i föreningens aktiviteter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Vem har tillgång till uppgifterna?</h2>
            <p className="mt-2 text-muted-foreground">
              Råuppgifterna är endast tillgängliga för behöriga administratörer. Styrelsemedlemmar och ledare kan ges administratörsbehörighet när det behövs för att administrera systemet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Hur länge sparas uppgifterna?</h2>
            <p className="mt-2 text-muted-foreground">
              Uppgifterna sparas så länge du är medlem och deltar i CheckIn MakeOn. De tas bort när du lämnar föreningen eller tidigare om du återkallar ditt samtycke och begär att bli borttagen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Minderåriga</h2>
            <p className="mt-2 text-muted-foreground">
              Minderåriga läggs till på begäran av vårdnadshavare. Vårdnadshavaren ska informeras om hur CheckIn MakeOn fungerar och att barnets namn, sammanräknade antal besök och eventuella utmärkelser kan visas på den publika topplistan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Dina rättigheter</h2>
            <p className="mt-2 text-muted-foreground">
              Du kan kontakta oss för att få information om vilka personuppgifter vi behandlar om dig, få felaktiga uppgifter rättade eller begära att uppgifterna tas bort. Du kan också återkalla ditt samtycke när som helst.
            </p>
          </section>

          <section className="border-t border-border pt-6">
            <p className="font-semibold">Personuppgiftsansvarig: Sundsvall Makers</p>
            <p className="mt-1 text-muted-foreground">Kontakt: kontakt@sundsvallmakers.se</p>
          </section>
        </div>
      </div>
    </div>
  );
}
