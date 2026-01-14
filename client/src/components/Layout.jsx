// ============================================
// FILE: client/src/components/Layout.jsx
// ✅ FINAL: Complete Sales dropdown + All corrections
// ============================================

import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import GlobalSearch from "./GlobalSearch";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  TrendingDown,
  BarChart3,
  Clock,
  Percent,
  RefreshCw,
  MessageSquare,
  PieChart,
  Building2,
  CreditCard,
  Receipt,
  Database,
  ShoppingCart,
  FileCheck,
  FileMinus,
  FilePlus,
  Truck,
  ClipboardList,
  Shield,
  Moon,
  Sun,
  User,
  Bell,
  Mail,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dark mode state
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Dropdown states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Refs for click outside detection
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  // Menu states
  const [salesOpen, setSalesOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Apply theme on mount
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Navigation items (non-dropdown)
  const navigationBeforeSales = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const navigationAfterSales = [
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Items", href: "/items", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
    { name: "GRN Management", href: "/grns", icon: Truck },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "HSN Codes", href: "/hsn-management", icon: Database },
  ];

  const navigationAfterAnalytics = [
    { name: "Audit Trails", href: "/audit-trail", icon: Shield },
  ];

  // ✅ COMPLETE Sales Menu - ALL items restored
  const salesMenu = [
    { name: "Quotations", href: "/sales/quotations", icon: ClipboardList },
    { name: "Tax Invoice", href: "/sales/tax-invoice", icon: FileText },
    { name: "Pro-Forma Invoice", href: "/sales/proforma", icon: FileCheck },
    { name: "Recurring Invoices", href: "/sales/recurring", icon: RefreshCw },
    { name: "Delivery Challan", href: "/sales/delivery-challan", icon: Truck },
    { name: "Credit Note", href: "/sales/credit-note", icon: FileMinus },
    { name: "Debit Note", href: "/sales/debit-note", icon: FilePlus },
  ];

  const analyticsMenu = [
    { name: "Dashboard", href: "/analytics", icon: PieChart },
    { name: "Advanced Reports", href: "/reports", icon: BarChart3 },
    { name: "GST Reports", href: "/gst-reports", icon: Receipt },
    {
      name: "Outstanding Reports",
      href: "/reports/outstanding",
      icon: TrendingDown,
    },
    { name: "Ageing Report", href: "/reports/ageing", icon: Clock },
  ];

  const settingsMenu = [
    {
      name: "Company Settings",
      href: "/settings/organization",
      icon: Building2,
    },
    { name: "Multi-GSTIN", href: "/multi-gstin", icon: Building2 },
    { name: "TDS Settings", href: "/settings/tds", icon: Percent },
    {
      name: "WhatsApp Settings",
      href: "/settings/whatsapp",
      icon: MessageSquare,
    },
  ];

  const isActive = (path) => {
    if (path === "/reports") {
      return location.pathname.startsWith("/reports");
    }
    if (path.startsWith("/sales/")) {
      return location.pathname.startsWith(path);
    }
    return location.pathname === path;
  };

  const NavItem = ({ item, mobile = false }) => (
    <Link
      to={item.href}
      onClick={() => mobile && setSidebarOpen(false)}
      className={`flex items-center ${
        sidebarCollapsed ? "justify-center" : "gap-3"
      } px-4 py-3 rounded-lg transition-colors group ${
        isActive(item.href)
          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      title={sidebarCollapsed ? item.name : ""}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {!sidebarCollapsed && <span>{item.name}</span>}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-20" : "w-64"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  EasyTaxERP
                </span>
              </div>
            )}

            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Dashboard */}
            {navigationBeforeSales.map((item) => (
              <NavItem key={item.name} item={item} mobile={true} />
            ))}

            {/* Sales Dropdown - ✅ ALL 7 items included */}
            <div>
              <button
                onClick={() => !sidebarCollapsed && setSalesOpen(!salesOpen)}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? "justify-center" : "justify-between"
                } gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname.startsWith("/sales") ||
                  location.pathname.startsWith("/invoices")
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                title={sidebarCollapsed ? "Sales" : ""}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Sales</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      salesOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {salesOpen && !sidebarCollapsed && (
                <div className="mt-1 ml-4 space-y-1">
                  {salesMenu.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Other nav items */}
            {navigationAfterSales.map((item) => (
              <NavItem key={item.name} item={item} mobile={true} />
            ))}

            {/* Analytics & Reports Dropdown */}
            <div>
              <button
                onClick={() =>
                  !sidebarCollapsed && setAnalyticsOpen(!analyticsOpen)
                }
                className={`w-full flex items-center ${
                  sidebarCollapsed ? "justify-center" : "justify-between"
                } gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname.startsWith("/analytics") ||
                  location.pathname.startsWith("/reports")
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                title={sidebarCollapsed ? "Analytics & Reports" : ""}
              >
                <div className="flex items-center gap-3">
                  <PieChart className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Analytics & Reports</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      analyticsOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {analyticsOpen && !sidebarCollapsed && (
                <div className="mt-1 ml-4 space-y-1">
                  {analyticsMenu.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Trail */}
            {navigationAfterAnalytics.map((item) => (
              <NavItem key={item.name} item={item} mobile={true} />
            ))}

            {/* Settings Dropdown */}
            <div>
              <button
                onClick={() =>
                  !sidebarCollapsed && setSettingsOpen(!settingsOpen)
                }
                className={`w-full flex items-center ${
                  sidebarCollapsed ? "justify-center" : "justify-between"
                } gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname.startsWith("/settings")
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                title={sidebarCollapsed ? "Settings" : ""}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Settings</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      settingsOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {settingsOpen && !sidebarCollapsed && (
                <div className="mt-1 ml-4 space-y-1">
                  {settingsMenu.map((setting) => (
                    <Link
                      key={setting.name}
                      to={setting.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                        isActive(setting.href)
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <setting.icon className="w-4 h-4" />
                      <span>{setting.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Support Section */}
            {!sidebarCollapsed && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 px-4">
                  SUPPORT
                </p>
                <Link
                  to="mailto:support@easytax.com"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span>Email</span>
                </Link>
              </div>
            )}
          </nav>

          {/* User Profile */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Collapsed mode user icon */}
          {sidebarCollapsed && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors duration-200">
          <div className="flex items-center justify-between px-4 py-4 gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* ✅ Wider Search Bar */}
            <div className="flex-1 max-w-3xl">
              <GlobalSearch />
            </div>

            {/* Top Right Options */}
            <div className="hidden lg:flex items-center gap-3">
              {/* ✅ Dark Mode Toggle - Round Border */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={
                  theme === "light"
                    ? "Switch to Dark Mode"
                    : "Switch to Light Mode"
                }
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-500" />
                )}
              </button>

              {/* ✅ Notifications - Round Border */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          New invoice created
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          2 hours ago
                        </p>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          Payment received
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          5 hours ago
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name?.split(" ")[0] || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      UserName
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        My Profile
                      </span>
                    </Link>
                    <Link
                      to="/settings/organization"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Settings
                      </span>
                    </Link>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
