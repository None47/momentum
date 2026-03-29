"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface XPToastProps {
  xp: number;
  bonusLabel: string | null;
  color: string;
  show: boolean;
}

export default function XPToast({ xp, bonusLabel, color, show }: XPToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-20 left-1/2 z-[90] flex flex-col items-center pointer-events-none"
          initial={{ opacity: 0, y: 0, x: "-50%" }}
          animate={{ opacity: 1, y: -60, x: "-50%" }}
          exit={{ opacity: 0, y: -80, x: "-50%" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {bonusLabel && (
            <motion.span
              className="text-[10px] tracking-[0.2em] font-bold mb-1"
              style={{ color }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {bonusLabel}
            </motion.span>
          )}
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color }}
          >
            +{xp}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
