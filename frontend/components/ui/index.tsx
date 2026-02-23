import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("glass-panel p-6", className)}>
        {children}
    </div>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button = ({
    children,
    variant = 'primary',
    className,
    ...props
}: ButtonProps) => {
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30",
        secondary: "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600",
        ghost: "hover:bg-slate-800 text-slate-300 hover:text-white"
    };

    return (
        <button
            {...props}
            className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 flex items-center justify-center gap-2",
                variants[variant],
                props.disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {children}
        </button>
    );
};

export const Input = ({ ...props }) => (
    <input
        {...props}
        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
    />
);
