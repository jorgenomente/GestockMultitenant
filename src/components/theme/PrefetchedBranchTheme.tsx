import { buildCssVariableMap, type BranchThemeFormValues } from "@/lib/theme/branchTheme";

type PrefetchedBranchThemeProps = {
  theme: BranchThemeFormValues;
};

const serializeCssVariables = (theme: BranchThemeFormValues) => {
  const map = buildCssVariableMap(theme);
  const declarations = Object.entries(map)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
  return `:root{${declarations}}`;
};

const serializeScriptPayload = (theme: BranchThemeFormValues) => {
  const payload = JSON.stringify(theme).replace(/</g, "\\u003C");
  return `window.__gestockPrefetchedTheme=${payload};`;
};

export default function PrefetchedBranchTheme({ theme }: PrefetchedBranchThemeProps) {
  const styleContent = serializeCssVariables(theme);
  const scriptContent = serializeScriptPayload(theme);

  return (
    <>
      <style data-prefetched-branch-theme dangerouslySetInnerHTML={{ __html: styleContent }} />
      <script
        data-prefetched-branch-theme
        dangerouslySetInnerHTML={{ __html: scriptContent }}
        suppressHydrationWarning
      />
    </>
  );
}
