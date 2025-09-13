import * as React from "react"
import { cn } from "@/lib/utils"

interface ChartConfig {
  [key: string]: {
    label: string;
    color?: string;
  };
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, config, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelFormatter?: (value: any) => string;
  content?: React.ReactNode;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  labelFormatter,
  content
}) => {
  if (!active || !payload) return null;
  
  if (content) return <>{content}</>;
  
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        {label && (
          <div className="col-span-2 font-medium">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        )}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ChartTooltipContentProps extends ChartTooltipProps {}

const ChartTooltipContent: React.FC<ChartTooltipContentProps> = (props) => {
  return <ChartTooltip {...props} />
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
}
