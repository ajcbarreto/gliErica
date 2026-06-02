"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OpenFoodFactsHit } from "@/lib/open-food-facts/map-product";
import { BrowserCodeReader, BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";
import {
  Camera,
  Globe2,
  ImageUp,
  MapPin,
  PackageSearch,
  ScanBarcode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

type Scope = "portugal" | "world";

const FORM_ANCHOR_ID = "explore-novo-alimento";

type Props = {
  online: boolean;
  /** Preenche o formulário «Novo alimento»; se carbs for null, só o nome é preenchido. */
  onApplyProduct: (name: string, carbsPer100g: number | null) => void;
};

function scrollToNovoAlimento() {
  requestAnimationFrame(() => {
    document.getElementById(FORM_ANCHOR_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  });
}

export function OpenFoodFactsPanel({ online, onApplyProduct }: Props) {
  const [scope, setScope] = useState<Scope>("portugal");
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OpenFoodFactsHit[]>([]);

  const [scanOpen, setScanOpen] = useState(false);
  const [appliedOpen, setAppliedOpen] = useState(false);
  const [appliedSummary, setAppliedSummary] = useState<{
    name: string;
    carbs: number | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pushProductToForm = useCallback(
    (hit: OpenFoodFactsHit) => {
      const label = hit.brand ? `${hit.brand} — ${hit.name}` : hit.name;
      onApplyProduct(label, hit.carbs_per_100g);
      setAppliedSummary({
        name: label,
        carbs: hit.carbs_per_100g,
      });
      setAppliedOpen(true);
      scrollToNovoAlimento();
    },
    [onApplyProduct]
  );

  const fetchProductByCode = useCallback(
    async (rawCode: string, options?: { fillForm?: boolean }) => {
      const fillForm = options?.fillForm ?? true;
      const code = rawCode.replace(/\D/g, "");
      if (code.length < 8 || code.length > 14) {
        setError("Indica um código de barras (8 a 14 dígitos).");
        return false;
      }
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(
          `/api/open-food-facts/product?code=${encodeURIComponent(code)}`
        );
        const data = (await res.json()) as {
          error?: string;
          product?: OpenFoodFactsHit;
        };
        if (!res.ok) {
          setError(data.error ?? "Produto não encontrado.");
          return false;
        }
        if (data.product) {
          setBarcode(code);
          setResults([data.product]);
          if (fillForm) {
            pushProductToForm(data.product);
          }
          return true;
        }
        return false;
      } catch {
        setError("Erro de rede.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [pushProductToForm]
  );

  const runSearch = useCallback(async () => {
    setError(null);
    const q = query.trim();
    if (q.length < 2) {
      setError("Escreve pelo menos 2 letras para pesquisar.");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const sp = new URLSearchParams({ q, scope });
      const res = await fetch(`/api/open-food-facts/search?${sp}`);
      const data = (await res.json()) as {
        error?: string;
        products?: OpenFoodFactsHit[];
      };
      if (!res.ok) {
        setError(data.error ?? "Pesquisa falhou.");
        return;
      }
      setResults(data.products ?? []);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [query, scope]);

  const runBarcode = useCallback(async () => {
    setError(null);
    const code = barcode.replace(/\D/g, "");
    if (code.length < 8 || code.length > 14) {
      setError("Indica um código de barras (8 a 14 dígitos).");
      return;
    }
    await fetchProductByCode(code, { fillForm: true });
  }, [barcode, fetchProductByCode]);

  const onPhotoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setError(null);
      const url = URL.createObjectURL(file);
      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        const result = await reader.decodeFromImageUrl(url);
        const text = result.getText().replace(/\D/g, "");
        if (text.length < 8 || text.length > 14) {
          setError(
            "Não foi possível ler um código de barras válido nesta imagem. Tenta melhor luz ou a câmara."
          );
          return;
        }
        await fetchProductByCode(text, { fillForm: true });
      } catch {
        setError(
          "Não foi possível ler um código de barras nesta imagem. Tenta outra foto ou introduz o código à mão."
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [fetchProductByCode]
  );

  if (!online) {
    return (
      <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 text-sm text-zinc-600">
        <p className="flex items-center gap-2 font-medium text-zinc-700">
          <PackageSearch className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          Open Food Facts
        </p>
        <p className="mt-2 text-xs leading-relaxed">
          Pesquisa de produtos requer ligação à Internet. Volta a tentar quando estiveres
          online.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-card">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
        <PackageSearch className="h-4 w-4 text-emerald-700" aria-hidden />
        Open Food Facts
      </p>
      <p className="mb-3 text-xs leading-relaxed text-zinc-600">
        Produtos embalados (ex.: supermercado). Os hidratos vêm da etiqueta nutricional
        na base comunitária — confirma no teu pacote se for crítico.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope("portugal")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            scope === "portugal"
              ? "border-emerald-600/40 bg-emerald-100/80 text-emerald-900"
              : "border-zinc-200 bg-white text-zinc-600"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Portugal
        </button>
        <button
          type="button"
          onClick={() => setScope("world")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            scope === "world"
              ? "border-emerald-600/40 bg-emerald-100/80 text-emerald-900"
              : "border-zinc-200 bg-white text-zinc-600"
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" aria-hidden />
          Mundo
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            inputMode="numeric"
            placeholder="Código de barras"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-emerald-500/25 focus:ring-2 sm:max-w-[11rem]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void runBarcode()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              <ScanBarcode className="h-4 w-4" aria-hidden />
              Procurar código
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setScanOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100/80 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" aria-hidden />
              Ler com a câmara
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              <ImageUp className="h-4 w-4" aria-hidden />
              Ler de uma foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onPhotoSelected(e)}
            />
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          A câmara ou a foto servem para <strong className="font-medium">ler o código de barras</strong>{" "}
          na imagem — o produto continua a ser identificado pelo número (EAN), como ao digitar.
        </p>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Nome do produto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/25 focus:ring-2"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSearch()}
          className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? "A pesquisar…" : "Pesquisar"}
        </button>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white p-2">
          {results.map((hit) => (
            <li
              key={hit.code}
              className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5 sm:flex-row sm:items-center"
            >
              {hit.image_url ? (
                <div className="relative mx-auto h-16 w-16 shrink-0 sm:mx-0">
                  <Image
                    src={hit.image_url}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="rounded-md border border-zinc-200/80 bg-white object-contain"
                  />
                </div>
              ) : (
                <div
                  className="mx-auto flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-100/80 text-[10px] text-zinc-400 sm:mx-0"
                  aria-hidden
                >
                  Sem foto
                </div>
              )}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-sm font-medium text-zinc-900">{hit.name}</p>
                {hit.brand && (
                  <p className="text-[11px] text-zinc-500">{hit.brand}</p>
                )}
                <p className="text-[11px] tabular-nums text-zinc-500">
                  {hit.carbs_per_100g !== null
                    ? `${hit.carbs_per_100g} g HC / 100 g`
                    : "Sem hidratos por 100 g na base"}
                  {" · "}
                  {hit.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => pushProductToForm(hit)}
                className="shrink-0 rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white sm:px-3"
              >
                Usar no formulário
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
        Dados{" "}
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-800 underline decoration-emerald-600/40 underline-offset-2 hover:decoration-emerald-700"
        >
          Open Food Facts
        </a>{" "}
        (ODbL). Contribuições da comunidade — podem conter erros.
      </p>

      <OffBarcodeScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDecoded={(digits) => void fetchProductByCode(digits, { fillForm: true })}
      />

      <Dialog open={appliedOpen} onOpenChange={setAppliedOpen}>
        <DialogContent showClose className="sm:max-w-md">
          <DialogTitle>Copiado para «Novo alimento»</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 space-y-3 text-sm text-zinc-600">
              <p>
                O nome e os hidratos (por 100 g) deste produto foram colocados no formulário{" "}
                <strong className="font-medium text-zinc-800">Novo alimento</strong>, mais abaixo
                nesta página.
              </p>
              {appliedSummary ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700">
                  <p className="font-medium text-zinc-900">{appliedSummary.name}</p>
                  <p className="mt-1 tabular-nums text-zinc-600">
                    {appliedSummary.carbs !== null
                      ? `${appliedSummary.carbs} g HC / 100 g`
                      : "Sem hidratos na base — preenche o HC manualmente se precisares."}
                  </p>
                </div>
              ) : null}
              <p className="text-xs text-zinc-500">
                Revisa os valores e toca em <strong className="font-medium">Adicionar à biblioteca</strong>{" "}
                quando estiveres pronta.
              </p>
            </div>
          </DialogDescription>
          <button
            type="button"
            onClick={() => setAppliedOpen(false)}
            className="mt-4 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            Entendi
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OffBarcodeScannerDialog({
  open,
  onOpenChange,
  onDecoded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecoded: (digits: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDecodedRef = useRef(onDecoded);
  const [scannerError, setScannerError] = useState<string | null>(null);

  onDecodedRef.current = onDecoded;

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      BrowserCodeReader.releaseAllStreams();
      setScannerError(null);
      return;
    }

    let cancelled = false;
    let raf = 0;

    const start = () => {
      const video = videoRef.current;
      if (!video) {
        raf = requestAnimationFrame(start);
        return;
      }

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      const reader = new BrowserMultiFormatReader(hints);

      void (async () => {
        try {
          controlsRef.current = await reader.decodeFromVideoDevice(
            undefined,
            video,
            (result) => {
              if (!result || cancelled) return;
              const text = result.getText().replace(/\D/g, "");
              if (text.length >= 8 && text.length <= 14) {
                controlsRef.current?.stop();
                BrowserCodeReader.releaseAllStreams();
                onDecodedRef.current(text);
                onOpenChange(false);
              }
            }
          );
        } catch {
          if (!cancelled) {
            setScannerError("Não foi possível usar a câmara. Verifica permissões ou tenta uma foto.");
          }
        }
      })();
    };

    raf = requestAnimationFrame(start);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      controlsRef.current?.stop();
      controlsRef.current = null;
      BrowserCodeReader.releaseAllStreams();
    };
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose className="max-h-[min(90dvh,40rem)] w-[min(calc(100vw-1.5rem),24rem)] p-0">
        <div className="border-b border-zinc-200 px-4 pb-3 pt-4 pr-12">
          <DialogTitle className="text-base">Ler código de barras</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-zinc-600">
            Aponta a câmara ao código. Quando for lido, a janela fecha e o produto é procurado.
          </DialogDescription>
        </div>
        <div className="px-4 pb-4">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              muted
              playsInline
            />
          </div>
          {scannerError && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {scannerError}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
