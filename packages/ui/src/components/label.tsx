"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

<<<<<<< HEAD:packages/ui/src/components/ui/label.tsx
import { cn } from "@/lib/utils"
=======
import { cn } from "../lib/utils"
>>>>>>> d4adbe85237fe7b2fb32bc6c7dee73943e7f6581:packages/ui/src/components/label.tsx

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
<<<<<<< HEAD:packages/ui/src/components/ui/label.tsx
    VariantProps<typeof labelVariants>
=======
  VariantProps<typeof labelVariants>
>>>>>>> d4adbe85237fe7b2fb32bc6c7dee73943e7f6581:packages/ui/src/components/label.tsx
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
