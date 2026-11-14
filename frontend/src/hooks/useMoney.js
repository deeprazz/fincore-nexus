import { useMemo } from "react";
import { money } from "../utils/money";

export function useMoney() {
  return useMemo(() => money, []);
}

export default useMoney;
