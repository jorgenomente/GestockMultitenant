"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function describeChildNode(child: React.ReactNode) {
  if (React.isValidElement(child)) {
    const type = child.type as { displayName?: string; name?: string } | string
    if (typeof type === "string") return type
    return type.displayName || type.name || "anonymous-element"
  }
  if (typeof child === "string") return `text(${JSON.stringify(child)})`
  if (typeof child === "number") return `number(${child})`
  if (typeof child === "boolean") return "boolean"
  if (child === null) return "null"
  if (child === undefined) return "undefined"
  return typeof child
}

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  asChild,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  const childArray = React.Children.toArray(children)
  const meaningfulChildren = childArray.filter((child) => {
    if (child === null || child === undefined) return false
    if (typeof child === "boolean") return false
    if (typeof child === "string" && child.trim().length === 0) return false
    return true
  })
  const onlyChild =
    meaningfulChildren.length === 1 && React.isValidElement(meaningfulChildren[0])
      ? meaningfulChildren[0]
      : null

  if (process.env.NODE_ENV !== "production" && asChild) {
    /* eslint-disable no-console */
    const rawChildCount = React.Children.count(children)
    console.log("[AccordionTrigger] asChild debug", {
      rawChildCount,
      meaningfulChildCount: meaningfulChildren.length,
      childTypes: childArray.map(describeChildNode),
      filteredChildTypes: meaningfulChildren.map(describeChildNode),
    })
    if (meaningfulChildren.length !== rawChildCount) {
      console.log("[AccordionTrigger] filtered out children", {
        rawChildCount,
        afterFilter: meaningfulChildren.length,
        childArray,
        meaningfulChildren,
      })
    }
    if (!onlyChild) {
      const childTypes = meaningfulChildren.map(describeChildNode)
      console.warn(
        "[AccordionTrigger] asChild expects exactly one React element child.",
        {
          childCount: meaningfulChildren.length,
          childTypes,
          hasOnlyValidChild: Boolean(onlyChild),
        }
      )
    }
    /* eslint-enable no-console */
  }

  const shouldUseSlot = Boolean(asChild && onlyChild)

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        asChild={shouldUseSlot}
        {...props}
      >
        {shouldUseSlot ? onlyChild : children}
        {!asChild ? (
          <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
        ) : null}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
