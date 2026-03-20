import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'wouter';

interface MenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface MobileMenuProps {
  items: MenuItem[];
  currentPath: string;
}

export function MobileMenu({ items, currentPath }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleNavigate = (href: string) => {
    setLocation(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-md transition-colors"
        style={{
          background: 'oklch(0.18 0.005 285)',
          color: 'var(--color-asx-text-secondary)',
        }}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Menu */}
      <nav
        className={`fixed left-0 top-14 bottom-0 w-64 z-50 transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'oklch(0.13 0.005 285)',
          borderRight: '1px solid oklch(0.22 0.005 285)',
        }}
      >
        <div className="p-4 space-y-2">
          {items.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={`w-full text-left px-4 py-3 rounded-md transition-colors flex items-center gap-3 text-sm font-medium ${
                currentPath === item.href
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {item.icon && <span className="w-5 h-5">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
