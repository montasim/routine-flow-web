"use client"

import * as React from "react"
import { Pen, Folder, Plus, Repeat2, Trash } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { View, Text } from "@/components/ui/layout"
import {
  RoutineFlowShell,
  Toolbar,
  api,
  categoryColorClasses,
  type ConfirmState,
  type Workspace,
} from "@/components/app/routineflow-shell"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Skeleton } from "@/components/ui/skeleton"

export function CategoriesPageClient() {
  return (
    <RoutineFlowShell page="categories">
      {(context) => {
        if (!context) return <CategoriesSkeleton />
        return (
          <CategoriesView
            workspace={context.workspace}
            openCategory={context.openCategory}
            confirm={context.confirm}
            reload={context.reload}
          />
        )
      }}
    </RoutineFlowShell>
  )
}

function CategoriesSkeleton() {
  return (
    <View className="grid gap-6">
      <Toolbar>
        <View className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </View>
        <Skeleton className="h-10 w-[140px] rounded-[var(--radius-md)]" />
      </Toolbar>
      <View className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <View className="flex items-start justify-between gap-3">
                <View className="w-full">
                  <View className="flex items-center gap-2">
                    <Skeleton className="size-2 rounded-full" />
                    <Skeleton className="h-6 w-1/2" />
                  </View>
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </View>
              </View>
            </CardHeader>
            <CardContent>
              <View className="grid grid-cols-3 rounded-[var(--radius-md)] border border-[var(--paper-200)] bg-[var(--paper-0)] overflow-hidden">
                <View className="p-3 border-r border-[var(--paper-200)]">
                  <Skeleton className="mb-1.5 h-3 w-16" />
                  <Skeleton className="h-5 w-8" />
                </View>
                <View className="p-3 border-r border-[var(--paper-200)]">
                  <Skeleton className="mb-1.5 h-3 w-16" />
                  <Skeleton className="h-5 w-12" />
                </View>
                <View className="p-3">
                  <Skeleton className="mb-1.5 h-3 w-16" />
                  <Skeleton className="h-5 w-8" />
                </View>
              </View>
            </CardContent>
          </Card>
        ))}
      </View>
    </View>
  )
}

function CategoriesView(props: {
  workspace: Workspace
  openCategory: (category: Category | "new") => void
  confirm: (state: ConfirmState) => void
  reload: () => Promise<void>
}) {
  const [deletingIds, setDeletingIds] = React.useState<string[]>([])

  return (
    <View className="grid gap-6">
      <Toolbar>
        <View className="flex gap-2">
          <Badge variant="signal">
            <Folder className="size-4" />
            {props.workspace.categories.length} categories
          </Badge>
          <Badge>
            <Repeat2 className="size-4" />
            {props.workspace.routines.filter((routine) => routine.isActive && !routine.isDeleted).length} active routines
          </Badge>
        </View>
        <Button variant="primary" onClick={() => props.openCategory("new")}>
          <Plus className="size-4" />
          New category
        </Button>
      </Toolbar>
      {props.workspace.categories.length === 0 ? (
        <View className="motion-reveal flex min-h-[400px] flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--paper-200)] bg-transparent p-8 text-center">
          <View className="mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--paper-100)]">
            <Folder className="size-7 text-[var(--ink-500)]" strokeWidth={1.5} />
          </View>
          <Text className="mb-2 text-[var(--text-lg)] font-semibold text-[var(--ink-900)]">No categories found</Text>
          <Text className="mb-6 max-w-[320px] text-[var(--text-sm)] text-[var(--ink-500)] leading-relaxed">
            Get started by creating a new category to organize your routines.
          </Text>
          <Button variant="primary" onClick={() => props.openCategory("new")}>
            <Plus className="size-4" />
            New category
          </Button>
        </View>
      ) : (
        <View className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {props.workspace.categories.map((category) => {
            const logs = props.workspace.logs.filter((log) => log.routineCategoryIdAtLog === category.id)
            const completion = logs.length ? Math.round((logs.filter((log) => log.status === "Completed").length / logs.length) * 100) : 0
            const routinesCount = props.workspace.routines.filter((routine) => routine.categoryId === category.id && !routine.isDeleted).length
            const pendingCount = props.workspace.occurrences.filter((occ) => props.workspace.routines.find((routine) => routine.id === occ.routineId)?.categoryId === category.id && occ.status === "Pending").length
            const categoryTone = categoryColorClasses(category.color)
            return (
              <Card key={category.id} className={cn("motion-card group relative", deletingIds.includes(category.id) && "opacity-50 pointer-events-none")}>
                <CardHeader>
                  <View className="flex items-start justify-between gap-3">
                    <View>
                      <CardTitle className="flex items-center gap-2">
                        <View className={cn("size-2 rounded-full", categoryTone.bg)} />
                        {category.name}
                      </CardTitle>
                      <CardDescription className="mt-1.5">{category.description || "Routine category"}</CardDescription>
                    </View>
                  </View>
                </CardHeader>
                <CardContent>
                  <View className="grid grid-cols-3 rounded-[var(--radius-md)] border border-[var(--paper-200)] bg-[var(--paper-0)] overflow-hidden">
                    <View className="p-3 border-r border-[var(--paper-200)]">
                      <Text className="font-mono text-[var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)] mb-1 block">Routines</Text>
                      <Text className="font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{routinesCount}</Text>
                    </View>
                    <View className="p-3 border-r border-[var(--paper-200)]">
                      <Text className="font-mono text-[var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)] mb-1 block">Complete</Text>
                      <Text className="font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{completion}%</Text>
                    </View>
                    <View className="p-3">
                      <Text className="font-mono text-[var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)] mb-1 block">Pending</Text>
                      <Text className="font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{pendingCount}</Text>
                    </View>
                  </View>

                  <View className="motion-card-actions absolute top-4 right-4 flex gap-1.5">
                    <Button variant="outline" size="icon" className="size-8 bg-[var(--paper-0)] shadow-sm hover:bg-[var(--paper-100)]" onClick={() => props.openCategory(category)}>
                      <Pen className="size-3.5 text-[var(--ink-700)]" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 bg-[var(--paper-0)] shadow-sm hover:bg-[var(--paper-100)]"
                      onClick={() =>
                        props.confirm({
                          title: "Delete category?",
                          body: "Deletion is blocked while non-deleted routines reference this category.",
                          label: "Delete category",
                          tone: "danger",
                          action: async () => {
                            setDeletingIds((prev) => [...prev, category.id])
                            try {
                              await api(`/api/v1/categories/${category.id}`, { method: "DELETE" })
                              toast.success("Category deleted.")
                              await props.reload()
                            } finally {
                              setDeletingIds((prev) => prev.filter((id) => id !== category.id))
                            }
                          },
                        })
                      }
                    >
                      <Trash className="size-3.5 text-[var(--ink-700)]" />
                    </Button>
                  </View>
                </CardContent>
              </Card>
            )
          })}
        </View>
      )}
    </View>
  )
}
