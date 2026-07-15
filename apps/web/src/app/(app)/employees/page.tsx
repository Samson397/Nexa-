"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getEmployees } from "@/lib/employees";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const statusVariant = {
  online: "success",
  busy: "warning",
  idle: "secondary",
} as const;

export default function EmployeesPage() {
  const employees = getEmployees();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          AI Employees
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Twelve specialized agents — strategy through sales — each with tools,
          guardrails, and approval-aware actions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {employees.map((employee, index) => (
          <motion.div
            key={employee.role}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Link href={`/employees/${employee.role}`}>
              <Card className="h-full transition-colors hover:border-accent/40 hover:bg-accent-soft/30">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {employee.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="truncate">{employee.name}</CardTitle>
                      <Badge variant={statusVariant[employee.status]}>
                        {employee.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-0.5">
                      {employee.title}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{employee.description}</p>
                  <p className="text-xs italic text-accent/90">
                    “{employee.personality}”
                  </p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
