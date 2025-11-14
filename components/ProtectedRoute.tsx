
import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    /**
    * Boolean indicating if the user is allowed to access this route.
    */
    isAllowed: boolean;
    /**
    * The component/page to render if allowed.
    */
    children: React.ReactElement;
    /**
    * Optional path to redirect to if not allowed. Defaults to "/".
    */
    redirectTo?: string;
}

/**
* A wrapper component that conditionally renders a route based on a
* permission prop. If not allowed, redirects the user.
*/
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    isAllowed,
    children,
    redirectTo = "/",
}) => {
    if (!isAllowed) {
        // User is not allowed, redirect them to the specified path
        return <Navigate to={redirectTo} replace />;
    }

    // User is allowed, render the child component
    return children;
};
