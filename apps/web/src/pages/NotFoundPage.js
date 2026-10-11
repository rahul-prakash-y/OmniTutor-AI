import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HelpCircle, Home } from 'lucide-react';
export const NotFoundPage = () => {
    return (_jsx("div", { className: "min-h-[60vh] flex items-center justify-center", children: _jsxs(Card, { className: "max-w-md w-full text-center space-y-4 p-8", children: [_jsx("div", { className: "w-16 h-16 rounded-2xl bg-brand-950/80 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400", children: _jsx(HelpCircle, { className: "w-8 h-8" }) }), _jsx("h1", { className: "text-2xl font-display font-bold text-white", children: "Page Not Found" }), _jsx("p", { className: "text-xs text-slate-400", children: "The requested route does not exist in the OmniTutor application." }), _jsx(Link, { to: "/", children: _jsxs(Button, { variant: "primary", size: "md", className: "mx-auto mt-2", children: [_jsx(Home, { className: "w-4 h-4 mr-1.5" }), "Back to Dashboard"] }) })] }) }));
};
