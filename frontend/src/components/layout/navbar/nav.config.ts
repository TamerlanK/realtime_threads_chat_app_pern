export type NavItem = {
  href: string
  label: string
  match?: (pathname: string) => boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/chat",
    label: "Chat",
    match: (p) => p.startsWith("/chat"),
  },
  {
    href: "/profile",
    label: "Profile",
    match: (p) => p.startsWith("/profile"),
  },
]
