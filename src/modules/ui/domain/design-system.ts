export const designTokens = {
  color: {
    page: "#fff7ed",
    surface: "#fffbf5",
    surfaceStrong: "#ffffff",
    border: "#fdba74",
    borderSubtle: "#fed7aa",
    orange: "#c2410c",
    orangeDark: "#9a3412",
    amber: "#9a3412",
    destructive: "#b91c1c",
    focus: "#ea7a1a",
    text: "#1f2937",
  },
  radius: {
    control: "6px",
    panel: "8px",
  },
} as const;

export const buttonVariantClassNames = {
  primary: "primary-action",
  secondary: "secondary-action",
  warning: "warning-action",
  destructive: "destructive-action",
} as const;

export type ButtonVariant = keyof typeof buttonVariantClassNames;

export function buttonClassName(variant: ButtonVariant): string {
  return buttonVariantClassNames[variant];
}
