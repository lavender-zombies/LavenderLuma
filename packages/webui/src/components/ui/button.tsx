import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    "ui-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,scale,opacity] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:border-ring cursor-pointer",
    {
        variants: {
            variant: {
                // No drop shadow on solid buttons: on a warm paper canvas a
                // shadow reads as grime around the edge. Depth comes from the
                // fill contrast and the press scale instead.
                default:
                    'bg-primary text-primary-foreground hover:bg-primary/92 active:bg-primary/86',
                destructive:
                    'bg-destructive text-destructive-foreground hover:bg-destructive/92 active:bg-destructive/86',
                outline:
                    'border border-input bg-card hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                // 36px is the working size: it matches the 14px label without
                // the chunky 40px block that made dense toolbars look heavy.
                default: 'h-9 px-3.5 py-2',
                sm: 'h-8 rounded-lg px-3 text-xs',
                lg: 'h-11 rounded-lg px-5',
                icon: 'ui-button-icon size-9',
                'icon-sm': 'ui-button-icon size-8',
            },
            press: {
                true: 'active:scale-[0.96] motion-reduce:active:scale-100',
                false: '',
            },
        },
        defaultVariants: { variant: 'default', size: 'default', press: true },
    },
);

type ButtonVariantProps = Omit<VariantProps<typeof buttonVariants>, 'press'>;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
    asChild?: boolean;
    /** Disable tactile press scaling when motion would distract from the action. */
    static?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, static: isStatic = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, press: !isStatic }), className)}
                ref={ref}
                data-press-scale={isStatic ? undefined : ''}
                data-variant={variant ?? 'default'}
                {...props}
            />
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
