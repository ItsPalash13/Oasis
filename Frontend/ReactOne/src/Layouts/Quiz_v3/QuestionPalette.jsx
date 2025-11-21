import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Flag, RadioButtonUnchecked } from "@mui/icons-material";

const QuestionPalette = ({ 
	currentIndex, 
	questionStates, 
	onNavigate, 
	totalQuestions
}) => {
	// Calculate counts for each status
	const counts = {
		notVisited: 0,
		notAnswered: 0,
		answered: 0,
		markedForReview: 0,
		answeredAndMarked: 0,
	};

	questionStates.forEach((state) => {
		if (!state.visited) {
			counts.notVisited++;
		} else if (state.answered && state.markedForReview) {
			counts.answeredAndMarked++;
		} else if (state.markedForReview) {
			counts.markedForReview++;
		} else if (state.answered) {
			counts.answered++;
		} else {
			counts.notAnswered++;
		}
	});

	// Get question state for styling
	const getQuestionState = (index) => {
		const state = questionStates[index];
		if (!state) return "notVisited";
		
		if (!state.visited) return "notVisited";
		if (state.answered && state.markedForReview) return "answeredAndMarked";
		if (state.markedForReview) return "markedForReview";
		if (state.answered) return "answered";
		return "notAnswered";
	};

	// Get button styles based on state
	const getButtonStyles = (index, state) => {
		const isCurrent = index === currentIndex;
		const baseStyles = {
			minWidth: "48px",
			height: "48px",
			borderRadius: 2,
			border: "2px solid",
			position: "relative",
			fontWeight: 600,
			fontSize: "0.875rem",
			textTransform: "none",
			transition: "all 0.2s ease",
		};

		switch (state) {
			case "notVisited":
				return {
					...baseStyles,
					backgroundColor: (theme) => 
						theme.palette.mode === "dark" ? "#2A2A2A" : "#E5E7EB",
					borderColor: (theme) => 
						theme.palette.mode === "dark" ? "#404040" : "#D1D5DB",
					color: (theme) => 
						theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
					...(isCurrent && {
						borderColor: (theme) => 
							theme.palette.mode === "dark" ? "#60A5FA" : "#3B82F6",
						borderWidth: "3px",
					}),
				};
			case "notAnswered":
				return {
					...baseStyles,
					backgroundColor: "#FFF3E0",
					borderColor: "#FF9800",
					color: "#E65100",
					...(isCurrent && {
						borderWidth: "3px",
						boxShadow: "0 0 0 2px rgba(255, 152, 0, 0.3)",
					}),
				};
			case "answered":
				return {
					...baseStyles,
					backgroundColor: "#E8F5E9",
					borderColor: "#4CAF50",
					color: "#2E7D32",
					...(isCurrent && {
						borderWidth: "3px",
						boxShadow: "0 0 0 2px rgba(76, 175, 80, 0.3)",
					}),
				};
			case "markedForReview":
				return {
					...baseStyles,
					backgroundColor: "#F3E5F5",
					borderColor: "#9C27B0",
					color: "#6A1B9A",
					...(isCurrent && {
						borderWidth: "3px",
						boxShadow: "0 0 0 2px rgba(156, 39, 176, 0.3)",
					}),
				};
			case "answeredAndMarked":
				return {
					...baseStyles,
					backgroundColor: "#F3E5F5",
					borderColor: "#9C27B0",
					color: "#6A1B9A",
					...(isCurrent && {
						borderWidth: "3px",
						boxShadow: "0 0 0 2px rgba(156, 39, 176, 0.3)",
					}),
				};
			default:
				return baseStyles;
		}
	};

	return (
		<Paper
			elevation={3}
			sx={{
				p: 2,
				mb: 3,
				position: "relative",
				width: "100%",
				boxSizing: "border-box",
				overflowX: "hidden",
				borderRadius: 2,
				backgroundColor: (theme) =>
					theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF",
			}}
		>
			{/* Status Indicators */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: "repeat(2, 1fr)",
					gap: 1.5,
					mb: 3,
					pb: 2,
					pr: 0, // No extra padding needed since button is outside content flow
					borderBottom: (theme) =>
						`2px dashed ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
				}}
			>
				{/* Not Visited */}
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: 1.5,
							backgroundColor: (theme) =>
								theme.palette.mode === "dark" ? "#2A2A2A" : "#E5E7EB",
							border: (theme) =>
								`2px solid ${theme.palette.mode === "dark" ? "#404040" : "#D1D5DB"}`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: (theme) =>
								theme.palette.mode === "dark" ? "#9CA3AF" : "#6B7280",
							fontWeight: 600,
							fontSize: "0.75rem",
							flexShrink: 0,
						}}
					>
						{counts.notVisited}
					</Box>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
						<Typography variant="caption" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
							Not Visited
						</Typography>
						<Typography
							variant="caption"
							sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.7rem" }}
						>
							{counts.notVisited}
						</Typography>
					</Box>
				</Box>

				{/* Not Answered */}
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: 1.5,
							backgroundColor: "#FFF3E0",
							border: "2px solid #FF9800",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#E65100",
							position: "relative",
							flexShrink: 0,
						}}
					>
						<Flag sx={{ fontSize: "1rem" }} />
					</Box>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
						<Typography variant="caption" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
							Not Answered
						</Typography>
						<Typography
							variant="caption"
							sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.7rem" }}
						>
							{counts.notAnswered}
						</Typography>
					</Box>
				</Box>

				{/* Answered */}
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: 1.5,
							backgroundColor: "#E8F5E9",
							border: "2px solid #4CAF50",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#2E7D32",
							position: "relative",
							flexShrink: 0,
						}}
					>
						<Flag sx={{ fontSize: "1rem" }} />
					</Box>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
						<Typography variant="caption" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
							Answered
						</Typography>
						<Typography
							variant="caption"
							sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.7rem" }}
						>
							{counts.answered}
						</Typography>
					</Box>
				</Box>

				{/* Marked for Review */}
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: "50%",
							backgroundColor: "#F3E5F5",
							border: "2px solid #9C27B0",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#6A1B9A",
							position: "relative",
							flexShrink: 0,
						}}
					>
						<RadioButtonUnchecked sx={{ fontSize: "1rem" }} />
					</Box>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
						<Typography variant="caption" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
							Marked for Review
						</Typography>
						<Typography
							variant="caption"
							sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.7rem" }}
						>
							{counts.markedForReview}
						</Typography>
					</Box>
				</Box>

				{/* Answered & Marked for Review */}
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: "50%",
							backgroundColor: "#F3E5F5",
							border: "2px solid #9C27B0",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#6A1B9A",
							position: "relative",
							flexShrink: 0,
						}}
					>
						<RadioButtonUnchecked sx={{ fontSize: "1rem" }} />
						<Flag
							sx={{
								fontSize: "0.65rem",
								position: "absolute",
								bottom: 1,
								left: 1,
								color: "#4CAF50",
							}}
						/>
					</Box>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0, flex: 1 }}>
						<Typography variant="caption" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
							Answered & Marked
						</Typography>
						<Typography
							variant="caption"
							sx={{ fontStyle: "italic", color: "text.secondary", fontSize: "0.65rem" }}
						>
							(will be considered)
						</Typography>
						<Typography
							variant="caption"
							sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.7rem" }}
						>
							{counts.answeredAndMarked}
						</Typography>
					</Box>
				</Box>
			</Box>

			{/* Question Number Grid */}
			<Box
				sx={{
					maxHeight: "300px",
					overflowY: "auto",
					display: "flex",
					flexWrap: "wrap",
					gap: 1.5,
					"&::-webkit-scrollbar": {
						width: "8px",
					},
					"&::-webkit-scrollbar-track": {
						backgroundColor: (theme) =>
							theme.palette.mode === "dark" ? "#1A1A1A" : "#F5F5F5",
					},
					"&::-webkit-scrollbar-thumb": {
						backgroundColor: (theme) =>
							theme.palette.mode === "dark" ? "#404040" : "#CCCCCC",
						borderRadius: "4px",
					},
				}}
			>
				{Array.from({ length: totalQuestions }, (_, index) => {
					const state = getQuestionState(index);
					const buttonStyles = getButtonStyles(index, state);
					const isCurrent = index === currentIndex;

					return (
						<Button
							key={index}
							onClick={() => onNavigate(index)}
							sx={buttonStyles}
							variant="outlined"
						>
							{/* Question Number */}
							<Typography
								sx={{
									fontWeight: 600,
									fontSize: "0.875rem",
									zIndex: 1,
								}}
							>
								{String(index + 1).padStart(2, "0")}
							</Typography>

							{/* Icons based on state */}
							{state === "notAnswered" && (
								<Flag
									sx={{
										position: "absolute",
										left: 4,
										top: 4,
										fontSize: "1rem",
										color: "#FF9800",
									}}
								/>
							)}
							{state === "answered" && (
								<Flag
									sx={{
										position: "absolute",
										left: 4,
										top: 4,
										fontSize: "1rem",
										color: "#4CAF50",
									}}
								/>
							)}
							{state === "markedForReview" && (
								<RadioButtonUnchecked
									sx={{
										position: "absolute",
										left: "50%",
										top: "50%",
										transform: "translate(-50%, -50%)",
										fontSize: "1.5rem",
										color: "#9C27B0",
									}}
								/>
							)}
							{state === "answeredAndMarked" && (
								<>
									<RadioButtonUnchecked
										sx={{
											position: "absolute",
											left: "50%",
											top: "50%",
											transform: "translate(-50%, -50%)",
											fontSize: "1.5rem",
											color: "#9C27B0",
										}}
									/>
									<Flag
										sx={{
											position: "absolute",
											bottom: 2,
											left: 2,
											fontSize: "0.75rem",
											color: "#4CAF50",
										}}
									/>
								</>
							)}
						</Button>
					);
				})}
			</Box>
		</Paper>
	);
};

export default QuestionPalette;

