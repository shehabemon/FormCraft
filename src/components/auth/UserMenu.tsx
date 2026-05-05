'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAuthUser, selectAuthStatus, signOut } from '@/store/slices/authSlice';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

function initials(name?: string, email?: string): string {
  const source = name ?? email ?? '';
  const parts = source.split(/[\s@._-]/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : source.slice(0, 2).toUpperCase();
}

function Avatar({
  user,
  size = 'md',
}: {
  user: { name?: string; email: string; avatarUrl?: string };
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[0.6875rem]' : 'w-8 h-8 text-[0.75rem]';
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt={user.name ?? user.email}
      className={cn(dim, 'rounded-full object-cover')}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className={cn(
        dim,
        'rounded-full flex items-center justify-center',
        'bg-[var(--color-primary)] text-white font-sans font-semibold',
      )}
    >
      {initials(user.name, user.email)}
    </div>
  );
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector(selectAuthUser);
  const status = useAppSelector(selectAuthStatus);

  const handleSignOut = async () => {
    await dispatch(signOut());
    router.push('/');
    router.refresh();
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <div
        className={cn(
          'rounded-full bg-[var(--color-stone-200)] animate-pulse shrink-0',
          compact ? 'w-7 h-7' : 'w-8 h-8',
        )}
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className={cn(
          'inline-flex items-center justify-center shrink-0',
          'rounded-[var(--radius-md)] border border-[var(--color-border-strong)]',
          'bg-white font-sans font-medium text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-default)]',
          'transition-all duration-150 active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          compact ? 'h-7 px-2.5 text-[0.75rem]' : 'h-8 px-3 text-[0.8125rem]',
        )}
      >
        Sign in
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          compact ? 'w-7 h-7' : 'w-8 h-8',
          'rounded-full shrink-0 overflow-hidden',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          'cursor-pointer transition-opacity hover:opacity-90',
        )}
        aria-label="Account menu"
      >
        <Avatar user={user} size={compact ? 'sm' : 'md'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-2 normal-case">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0">
                <Avatar user={user} size="md" />
              </div>
              <div className="min-w-0">
                {user.name && (
                  <p className="font-sans text-[0.8125rem] font-semibold text-[var(--color-text-primary)] truncate leading-tight">
                    {user.name}
                  </p>
                )}
                <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] truncate leading-tight">
                  {user.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="gap-2 cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOut size={13} className="shrink-0" />
          <span className="font-sans text-[0.8125rem]">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
