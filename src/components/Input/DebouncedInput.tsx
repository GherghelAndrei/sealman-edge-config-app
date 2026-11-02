import { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface DebouncedInputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
}

export default function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  onKeyDown,
  className,
  ...props
}: DebouncedInputProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(value);
    }, debounce);

    return () => clearTimeout(timeoutRef.current);
  }, [value, debounce]);

  const handleClear = () => {
    clearTimeout(timeoutRef.current);
    setValue("");
    onChange("");
  };

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        className={`${className ?? ""} pr-8`}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
          setValue(ev.target.value)
        }
        onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement>) => {
          if (ev.key === "Enter") {
            clearTimeout(timeoutRef.current);
            onChange(value);
          }
          onKeyDown?.(ev);
        }}
      />
      {value !== "" && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
          aria-label="Clear search"
        >
          <XMarkIcon />
        </Button>
      )}
    </div>
  );
}
