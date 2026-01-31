"use client";

import { useEffect, useMemo, useState } from "react";

type ImageUploadFieldProps = {
  name?: string;
  label?: string;
  helperText?: string;
  multiple?: boolean;
};

export default function ImageUploadField({
  name = "images",
  label = "Fotos do anuncio",
  helperText = "Envie uma ou mais fotos para destacar o anuncio.",
  multiple = true,
}: ImageUploadFieldProps) {
  const [files, setFiles] = useState<File[]>([]);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold text-zinc-700">{label}</label>
        <p className="mt-1 text-xs text-zinc-500">{helperText}</p>
      </div>
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
        <input
          type="file"
          name={name}
          accept="image/*"
          multiple={multiple}
          className="text-sm text-zinc-600"
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? []);
            setFiles(nextFiles);
          }}
        />
        {previews.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {previews.map((preview) => (
              <div
                key={preview.url}
                className="h-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                title={preview.name}
              >
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            Nenhuma imagem selecionada.
          </p>
        )}
      </div>
    </div>
  );
}
