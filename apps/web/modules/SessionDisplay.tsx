import React from "react";

interface SessionDisplayProps {
	sessionData: any; // Replace 'any' with your actual session data type
}

const SessionDisplay: React.FC<SessionDisplayProps> = ({ sessionData }) => {
	return (
		<div>
			<h2>Session Data</h2>
			<pre>{JSON.stringify(sessionData, null, 2)}</pre>
		</div>
	);
};

export default SessionDisplay;
