import { useColorTheme } from "@/hooks/useColorTheme";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

function Swatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex items-center -space-x-1">
      {colors.map((c) => (
        <span
          key={c}
          className="h-3 w-3 rounded-full border border-border/60"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

export function ColorThemeSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { colorTheme, setColorTheme, themes } = useColorTheme();
  const active = themes.find((t) => t.id === colorTheme) ?? themes[0];

  const list = (
    <DropdownMenuContent side="right" align="end" className="w-56">
      <DropdownMenuLabel className="text-xs">🎨 Tema Warna</DropdownMenuLabel>
      {themes.map((t) => (
        <DropdownMenuItem
          key={t.id}
          onSelect={() => setColorTheme(t.id)}
          className="gap-2 text-xs cursor-pointer"
        >
          <Swatch colors={t.swatches} />
          <span className="flex-1 truncate">{t.name}</span>
          {t.id === colorTheme && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );

  if (collapsed) {
    return (
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Pilih tema warna"
                className="w-full flex justify-center"
              >
                <div className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-sidebar-foreground/10 transition-colors duration-150">
                  <Swatch colors={active.swatches} />
                </div>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="text-xs">
            Tema: {active.name}
          </TooltipContent>
        </Tooltip>
        {list}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Pilih tema warna"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-colors duration-150"
        >
          <Swatch colors={active.swatches} />
          <span className="text-[13px] truncate flex-1 text-left">{active.name}</span>
        </button>
      </DropdownMenuTrigger>
      {list}
    </DropdownMenu>
  );
}
