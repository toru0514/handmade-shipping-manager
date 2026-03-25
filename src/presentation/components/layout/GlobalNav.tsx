'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import CategoryIcon from '@mui/icons-material/Category';
import ForestIcon from '@mui/icons-material/Forest';
import WorkIcon from '@mui/icons-material/Work';

const DRAWER_WIDTH_OPEN = 208;
const DRAWER_WIDTH_CLOSED = 56;

const navItems = [
  { href: '/orders', label: '注文管理', icon: <InventoryIcon fontSize="small" /> },
  { href: '/buyers', label: '購入者一覧', icon: <PeopleIcon fontSize="small" /> },
  { href: '/sales', label: '売上集計', icon: <BarChartIcon fontSize="small" /> },
  { href: '/dashboard', label: '商品管理', icon: <CategoryIcon fontSize="small" /> },
  { href: '/dashboard/woods', label: '木材管理', icon: <ForestIcon fontSize="small" /> },
  { href: '/dashboard/jobs', label: 'ジョブ', icon: <WorkIcon fontSize="small" /> },
  { href: '/settings', label: '設定', icon: <SettingsIcon fontSize="small" /> },
];

export function GlobalNav() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const handleOpenSpreadsheet = useCallback(async () => {
    try {
      const res = await fetch('/api/spreadsheet-url');
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // silently ignore
    }
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const drawerWidth = open ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED;

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.2s',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            transition: 'width 0.2s',
            overflowX: 'hidden',
            boxSizing: 'border-box',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: open ? 2 : 0,
            py: 1.5,
            justifyContent: open ? 'space-between' : 'center',
          }}
        >
          {open && (
            <Link
              href="/orders"
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: '#1e293b',
                textDecoration: 'none',
              }}
            >
              ハンドメイド発送管理
            </Link>
          )}
          <IconButton onClick={() => setOpen(!open)} size="small">
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ flex: 1, pt: 1 }}>
          {navItems.map(({ href, label, icon }) => {
            const selected = pathname.startsWith(href);
            const button = (
              <ListItemButton
                key={href}
                component={Link}
                href={href}
                selected={selected}
                sx={{
                  minHeight: 40,
                  px: open ? 2 : 1.5,
                  justifyContent: open ? 'initial' : 'center',
                  borderRadius: 1,
                  mx: 0.5,
                  mb: 0.25,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 1.5 : 0,
                    justifyContent: 'center',
                    color: selected ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {icon}
                </ListItemIcon>
                {open && <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14 }} />}
              </ListItemButton>
            );
            return open ? (
              button
            ) : (
              <Tooltip key={href} title={label} placement="right">
                {button}
              </Tooltip>
            );
          })}
        </List>
        <Divider />
        <List>
          <Tooltip title={open ? '' : 'スプシを開く'} placement="right">
            <ListItemButton
              onClick={handleOpenSpreadsheet}
              sx={{
                minHeight: 40,
                px: open ? 2 : 1.5,
                justifyContent: open ? 'initial' : 'center',
                borderRadius: 1,
                mx: 0.5,
                mb: 0.25,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 1.5 : 0,
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary="スプシを開く"
                  primaryTypographyProps={{ fontSize: 14, color: 'text.secondary' }}
                />
              )}
            </ListItemButton>
          </Tooltip>
          <Tooltip title={open ? '' : 'ログアウト'} placement="right">
            <ListItemButton
              onClick={handleLogout}
              sx={{
                minHeight: 40,
                px: open ? 2 : 1.5,
                justifyContent: open ? 'initial' : 'center',
                borderRadius: 1,
                mx: 0.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 1.5 : 0,
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary="ログアウト"
                  primaryTypographyProps={{ fontSize: 14, color: 'text.secondary' }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </List>
      </Drawer>
      <style jsx global>{`
        :root {
          --nav-width: ${drawerWidth}px;
        }
      `}</style>
    </>
  );
}

export { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED };
