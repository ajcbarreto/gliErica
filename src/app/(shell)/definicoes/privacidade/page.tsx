import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DefinicoesPrivacidadePage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-3">
        <Link
          href="/definicoes"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Definições
        </Link>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Conta
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Privacidade
          </h1>
          <p className="text-sm text-zinc-600">
            Como tratamos os teus dados na GliErica.
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
          <h2 className="text-sm font-medium text-zinc-900">
            Responsável pelo tratamento
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Os dados pessoais que introduzes na aplicação são tratados no âmbito
            da prestação do serviço GliErica, de acordo com o Regulamento Geral
            sobre a Proteção de Dados (RGPD) e a legislação nacional aplicável.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
          <h2 className="text-sm font-medium text-zinc-900">
            Que dados recolhemos
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Podem ser tratados, entre outros: dados de conta (por exemplo email e
            nome), dados de saúde que registas voluntariamente (como valores de
            glicemia, refeições ou notas clínicas) e dados técnicos necessários
            ao funcionamento seguro da app (como identificadores de sessão).
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
          <h2 className="text-sm font-medium text-zinc-900">
            Finalidades e base legal
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Os dados são utilizados para te permitir gerir a tua informação de
            saúde na aplicação, manter a conta segura e cumprir obrigações
            legais quando aplicável. Dados de saúde sensíveis só devem ser
            tratados com o teu consentimento explícito ou noutras bases
            previstas na lei.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
          <h2 className="text-sm font-medium text-zinc-900">
            Conservação e segurança
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Aplicamos medidas técnicas e organizativas adequadas à natureza dos
            dados. O período de conservação depende da necessidade de
            prestação do serviço e de requisitos legais; podes pedir esclarecimentos
            ou exercer os teus direitos contactando o responsável indicado nos
            canais oficiais do projeto.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
          <h2 className="text-sm font-medium text-zinc-900">Os teus direitos</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Tens direito a aceder, retificar ou apagar os teus dados, a limitar
            ou opor-te ao tratamento, à portabilidade quando aplicável e a
            apresentar reclamação à autoridade de controlo (em Portugal, a CNPD).
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
          <h2 className="text-sm font-medium text-zinc-900">Alterações</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Esta página pode ser atualizada para refletir evoluções do serviço ou
            da lei. A data da última revisão pode ser indicada aqui quando
            formalizares o texto jurídico definitivo com apoio legal.
          </p>
        </section>
      </div>
    </div>
  );
}
