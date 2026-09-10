"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 rounded-xl m-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full mb-3">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
            Đã có lỗi xảy ra khi tải giao diện
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
            {this.state.error?.message || "Lỗi không xác định trong thành phần giao diện."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Thử tải lại
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
