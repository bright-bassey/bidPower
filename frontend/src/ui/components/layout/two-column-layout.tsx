import React from 'react';

interface TwoColumnLayoutProps {
    children: React.ReactNode;
}

const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({ children }) => {
    return (
        <div className="flex h-screen bg-white">
            {children}
        </div>
    );
};

export default TwoColumnLayout;