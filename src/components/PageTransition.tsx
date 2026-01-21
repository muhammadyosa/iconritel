import { motion, useReducedMotion, type Transition, type Variants } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  const pageVariants: Variants = {
    initial: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 6,
    },
    in: {
      opacity: 1,
      y: 0,
    },
    out: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -6,
    },
  };

  const pageTransition: Transition = {
    type: "tween",
    ease: prefersReducedMotion ? "linear" : [0.22, 1, 0.36, 1],
    duration: prefersReducedMotion ? 0.01 : 0.18,
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full min-w-0"
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
