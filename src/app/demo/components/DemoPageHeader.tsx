import { Badge } from "@/components/ui/badge";

export default function DemoPageHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <header className="mb-8 space-y-3">
      {badge ? (
        <Badge variant="muted" className="uppercase tracking-wide">
          {badge}
        </Badge>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
    </header>
  );
}
