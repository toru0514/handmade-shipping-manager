'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
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
import MessageIcon from '@mui/icons-material/Message';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import CategoryIcon from '@mui/icons-material/Category';
import ForestIcon from '@mui/icons-material/Forest';
import ImageIcon from '@mui/icons-material/Image';

const DRAWER_WIDTH_OPEN = 208;
const DRAWER_WIDTH_CLOSED = 56;
const MOBILE_APPBAR_HEIGHT = 56;

const navItems = [
  { href: '/orders', label: '注文管理', icon: <InventoryIcon fontSize="small" /> },
  { href: '/buyers', label: '購入者一覧', icon: <PeopleIcon fontSize="small" /> },
  { href: '/settings', label: '定型文設定', icon: <MessageIcon fontSize="small" /> },
  { href: '/sales', label: '売上集計', icon: <BarChartIcon fontSize="small" /> },
  { href: '/products', label: '商品管理', icon: <CategoryIcon fontSize="small" /> },
  { href: '/woods', label: '木材管理', icon: <ForestIcon fontSize="small" /> },
  { href: '/images', label: '画像管理', icon: <ImageIcon fontSize="small" /> },
];

export function GlobalNav() {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const handleMobileToggle = () => setMobileOpen(!mobileOpen);

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const drawerWidth = open ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED;

  const drawerContent = (
    <>
      {!isMobile && (
        <>
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
        </>
      )}
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map(({ href, label, icon }) => {
          const selected = pathname.startsWith(href);
          const showText = isMobile || open;
          const button = (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={selected}
              onClick={handleNavClick}
              sx={{
                minHeight: 40,
                px: showText ? 2 : 1.5,
                justifyContent: showText ? 'initial' : 'center',
                borderRadius: 1,
                mx: 0.5,
                mb: 0.25,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: showText ? 1.5 : 0,
                  justifyContent: 'center',
                  color: selected ? 'primary.main' : 'text.secondary',
                }}
              >
                {icon}
              </ListItemIcon>
              {showText && (
                <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14 }} />
              )}
            </ListItemButton>
          );
          return showText ? (
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
        <Tooltip title={isMobile || open ? '' : 'ログアウト'} placement="right">
          <ListItemButton
            onClick={() => {
              handleLogout();
              handleNavClick();
            }}
            sx={{
              minHeight: 40,
              px: isMobile || open ? 2 : 1.5,
              justifyContent: isMobile || open ? 'initial' : 'center',
              borderRadius: 1,
              mx: 0.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: isMobile || open ? 1.5 : 0,
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {(isMobile || open) && (
              <ListItemText
                primary="ログアウト"
                primaryTypographyProps={{ fontSize: 14, color: 'text.secondary' }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </List>
    </>
  );

  if (isMobile) {
    return (
      <>
        <AppBar position="fixed" color="default" elevation={1} sx={{ bgcolor: 'background.paper' }}>
          <Toolbar variant="dense" sx={{ minHeight: MOBILE_APPBAR_HEIGHT }}>
            <IconButton edge="start" onClick={handleMobileToggle} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Typography
              variant="subtitle2"
              component={Link}
              href="/orders"
              sx={{ fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}
            >
              ハンドメイド発送管理
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleMobileToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH_OPEN,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <style jsx global>{`
          :root {
            --nav-width: 0px;
            --appbar-height: ${MOBILE_APPBAR_HEIGHT}px;
          }
        `}</style>
      </>
    );
  }

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
        {drawerContent}
      </Drawer>
      <style jsx global>{`
        :root {
          --nav-width: ${drawerWidth}px;
          --appbar-height: 0px;
        }
      `}</style>
    </>
  );
}

export { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED, MOBILE_APPBAR_HEIGHT };
