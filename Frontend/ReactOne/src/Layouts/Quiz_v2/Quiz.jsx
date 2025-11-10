import React, { useEffect, useState } from "react";
import { Box, Card, CardContent, CircularProgress, Grid, Typography } from "@mui/material";
import { QuizHeader, QuestionCard, OptionCard, StyledButton, TimeDisplay, XpDisplay, HeartDisplay, quizStyles } from "../../theme/quizTheme";
import { Timer as TimerIcon, ArrowBack as ArrowBackIcon, Star as StarIcon, Favorite as HealthIcon } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import MaxScoreNotification from "./MaxScoreNotification";

const Quiz = ({ socket }) => {
	const navigate = useNavigate();
	const { quizId } = useParams();
	const quizSession = useSelector((state) => state?.quizSession?.session);
	const sessionId = quizSession?.id || quizId; // Fallback to quizId if session.id is missing
	const [isLoading, setIsLoading] = useState(true);
	const [question, setQuestion] = useState(null);
	const [selectedAnswer, setSelectedAnswer] = useState(null);
	const [result, setResult] = useState(null);
	const [time, setTime] = useState(0);
	const [currentScore, setCurrentScore] = useState(0);
	const [heartsLeft, setHeartsLeft] = useState(3);
	const [questionsCorrect, setQuestionsCorrect] = useState(0);
	const [questionsIncorrect, setQuestionsIncorrect] = useState(0);
	const [quizEnded, setQuizEnded] = useState(false);
	const [quizResults, setQuizResults] = useState(null);
	const [showMaxScore, setShowMaxScore] = useState(false);
	const [maxScoreValue, setMaxScoreValue] = useState(0);

	// minimal local timer (commented out)
	// useEffect(() => {
	//   const i = setInterval(() => setTime((t) => t + 1), 1000);
	//   return () => clearInterval(i);
	// }, []);

	// connect and fetch question
	useEffect(() => {
		if (!socket.connected) {
			socket.connect();
		}
		const onConnect = () => {
			console.log("SOCKET INITIATE SOCKET ID :", sessionId);
			socket.emit("initiate", { sessionId });
		};
		const onQuestion = (data) => {
			setQuestion(data);
			setSelectedAnswer(null);
			setResult(null);
			setIsLoading(false);
			if (data.currentScore !== undefined) {
				setCurrentScore(data.currentScore);
			}
			if (data.heartsLeft !== undefined) {
				setHeartsLeft(data.heartsLeft);
			}
			if (data.questionsCorrect !== undefined) {
				setQuestionsCorrect(data.questionsCorrect);
			}
			if (data.questionsIncorrect !== undefined) {
				setQuestionsIncorrect(data.questionsIncorrect);
			}
		};
		const onResult = (data) => {
			console.log("Received result:", data);
			setResult(data);
			if (data.currentScore !== undefined) {
				setCurrentScore(data.currentScore);
			}
			if (data.heartsLeft !== undefined) {
				setHeartsLeft(data.heartsLeft);
			}
			if (data.questionsCorrect !== undefined) {
				setQuestionsCorrect(data.questionsCorrect);
			}
			if (data.questionsIncorrect !== undefined) {
				setQuestionsIncorrect(data.questionsIncorrect);
			}
			setIsLoading(false);
		};

		const onQuizEnded = (data) => {
			console.log("Quiz ended:", data);
			setQuizEnded(true);
			setQuizResults(data);
			setIsLoading(false);
		};

		const onMaxScoreReached = (data) => {
			setMaxScoreValue(data.maxScore);
			setShowMaxScore(true);
			setTimeout(() => setShowMaxScore(false), 4000);
		};

		socket.on("connect", onConnect);
		socket.on("question", onQuestion);
		socket.on("result", onResult);
		socket.on("quizEnded", onQuizEnded);
		socket.on("maxScoreReached", onMaxScoreReached);

		return () => {
			socket.off("connect", onConnect);
			socket.off("question", onQuestion);
			socket.off("result", onResult);
			socket.off("quizEnded", onQuizEnded);
			socket.off("maxScoreReached", onMaxScoreReached);
			if (socket.connected) socket.disconnect();
		};
	}, [socket, quizId, sessionId]);

	const submitAnswer = () => {
		if (!question || selectedAnswer === null) return;
		setIsLoading(true);
		socket.emit("answer", { id: question.id, answerIndex: selectedAnswer, sessionId });
	};

	const nextQuestion = () => {
		setIsLoading(true);
		socket.emit("initiate", { sessionId });
	};

	const handleEndQuiz = () => {
		if (window.confirm("Are you sure you want to end the quiz?")) {
			setIsLoading(true);
			socket.emit("endSession", { sessionId });
		}
	};

	const formatTime = (seconds) => {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	return (
		<Box sx={{ p: 2 }}>
			<QuizHeader>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					{!quizEnded && (
						<StyledButton
							variant="outlined"
							size="small"
							onClick={handleEndQuiz}
							sx={quizStyles.backButton}
						>
							<ArrowBackIcon fontSize="small" />
						</StyledButton>
					)}
				</Box>
				{!quizEnded && (
					<Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1.5 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<XpDisplay>
								<StarIcon />
								<Typography variant="h6" sx={{ fontWeight: "bold" }}>
									{currentScore} XP
								</Typography>
							</XpDisplay>
							<HeartDisplay>
								<HealthIcon />
								<Typography variant="h6" sx={{ fontWeight: "bold" }}>
									{heartsLeft}
								</Typography>
							</HeartDisplay>
						</Box>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<Typography 
								variant="h4" 
								sx={{ 
									fontWeight: "bold",
									color: "#4CAF50"
								}}
							>
								{questionsCorrect > 0 ? `+${questionsCorrect}` : questionsCorrect}
							</Typography>
							<Typography 
								variant="h4" 
								sx={{ 
									fontWeight: "bold",
									color: "#F44336"
								}}
							>
								{questionsIncorrect > 0 ? `-${questionsIncorrect}` : questionsIncorrect}
							</Typography>
						</Box>
					</Box>
				)}
			</QuizHeader>

			{isLoading ? (
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
					<CircularProgress />
				</Box>
			) : quizEnded && quizResults ? (
				<Box sx={{ mt: 3, maxWidth: 550, mx: "auto" }}>
					{/* Results Display */}
					<QuestionCard>
						<CardContent sx={{ p: 3 }}>
							{/* Header Message */}
							<Box sx={{ textAlign: "center", mb: 3 }}>
								<Typography
									variant="h4"
									sx={{
										fontWeight: "bold",
										mb: 0.5,
										color: (theme) =>
											quizResults.endReason === "hearts_exhausted"
												? theme.palette.error.main
												: theme.palette.primary.main,
									}}
								>
									{quizResults.endReason === "hearts_exhausted" ? "💔" : "🎯"}
								</Typography>
								<Typography
									variant="h6"
									sx={{
										fontWeight: "bold",
										mb: 1,
										color: (theme) =>
											quizResults.endReason === "hearts_exhausted"
												? theme.palette.error.main
												: theme.palette.primary.main,
									}}
								>
									{quizResults.message || "Quiz Ended"}
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
									{quizResults.endReason === "hearts_exhausted"
										? "You ran out of hearts! Better luck next time."
										: "Great effort! Here's how you performed."}
								</Typography>
							</Box>

							{/* Score Display */}
							<Box
								sx={{
									display: "flex",
									justifyContent: "center",
									mb: 3,
								}}
							>
								<XpDisplay
									sx={{
										p: 2,
										minWidth: 200,
										justifyContent: "center",
										boxShadow: "0 6px 20px rgba(245, 158, 11, 0.35)",
									}}
								>
									<StarIcon sx={{ fontSize: "2rem" }} />
									<Box sx={{ ml: 1 }}>
										<Typography variant="h3" sx={{ fontWeight: "bold", lineHeight: 1, mb: 0.25 }}>
											{quizResults.data?.currentScore || 0}
										</Typography>
										<Typography variant="body1" sx={{ fontWeight: "bold", opacity: 0.9 }}>
											Total XP
										</Typography>
									</Box>
								</XpDisplay>
							</Box>

							{/* Stats Grid */}
							<Grid container spacing={2} sx={{ mb: 3 }}>
								<Grid size={{ xs: 6, sm: 3 }} >
									<Card
										sx={{
											
											textAlign: "center",
											p: 2,
											borderRadius: 2,
											background: (theme) =>
												theme.palette.mode === "dark"
													? "rgba(76, 175, 80, 0.15)"
													: "rgba(76, 175, 80, 0.1)",
											border: "2px solid",
											borderColor: "success.main",
											boxShadow: (theme) =>
												theme.palette.mode === "dark"
													? "0 4px 12px rgba(76, 175, 80, 0.2)"
													: "0 4px 12px rgba(76, 175, 80, 0.15)",
											transition: "all 0.3s ease-in-out",
											"&:hover": {
												transform: "translateY(-4px)",
												boxShadow: (theme) =>
													theme.palette.mode === "dark"
														? "0 8px 20px rgba(76, 175, 80, 0.3)"
														: "0 8px 20px rgba(76, 175, 80, 0.25)",
											},
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", color: "success.main", mb: 0.5 }}>
											{quizResults.data?.questionsCorrect || 0}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Correct
										</Typography>
									</Card>
								</Grid>
								<Grid size={{ xs: 6, sm: 3 }} >
									<Card
										sx={{
											textAlign: "center",
											p: 2,
											borderRadius: 2,
											background: (theme) =>
												theme.palette.mode === "dark"
													? "rgba(244, 67, 54, 0.15)"
													: "rgba(244, 67, 54, 0.1)",
											border: "2px solid",
											borderColor: "error.main",
											boxShadow: (theme) =>
												theme.palette.mode === "dark"
													? "0 4px 12px rgba(244, 67, 54, 0.2)"
													: "0 4px 12px rgba(244, 67, 54, 0.15)",
											transition: "all 0.3s ease-in-out",
											"&:hover": {
												transform: "translateY(-4px)",
												boxShadow: (theme) =>
													theme.palette.mode === "dark"
														? "0 8px 20px rgba(244, 67, 54, 0.3)"
														: "0 8px 20px rgba(244, 67, 54, 0.25)",
											},
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", color: "error.main", mb: 0.5 }}>
											{quizResults.data?.questionsIncorrect || 0}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Incorrect
										</Typography>
									</Card>
								</Grid>
								<Grid size={{ xs: 6, sm: 3 }} >
									<Card
										sx={{
											textAlign: "center",
											p: 2,
											borderRadius: 2,
											background: (theme) =>
												theme.palette.mode === "dark"
													? "rgba(255, 255, 255, 0.05)"
													: "rgba(0, 0, 0, 0.03)",
											border: (theme) =>
												theme.palette.mode === "dark"
													? "2px solid rgba(255, 255, 255, 0.1)"
													: "2px solid rgba(0, 0, 0, 0.1)",
											boxShadow: (theme) =>
												theme.palette.mode === "dark"
													? "0 4px 12px rgba(0, 0, 0, 0.3)"
													: "0 4px 12px rgba(0, 0, 0, 0.1)",
											transition: "all 0.3s ease-in-out",
											"&:hover": {
												transform: "translateY(-4px)",
												boxShadow: (theme) =>
													theme.palette.mode === "dark"
														? "0 8px 20px rgba(0, 0, 0, 0.4)"
														: "0 8px 20px rgba(0, 0, 0, 0.15)",
											},
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
											{quizResults.data?.questionsAttempted || 0}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Attempted
										</Typography>
									</Card>
								</Grid>
								<Grid size={{ xs: 6, sm: 3 }} >
									<Card
										sx={{
											textAlign: "center",
											p: 2,
											borderRadius: 2,
											background: (theme) =>
												theme.palette.mode === "dark"
													? "rgba(33, 150, 243, 0.15)"
													: "rgba(33, 150, 243, 0.1)",
											border: "2px solid",
											borderColor: "primary.main",
											boxShadow: (theme) =>
												theme.palette.mode === "dark"
													? "0 4px 12px rgba(33, 150, 243, 0.2)"
													: "0 4px 12px rgba(33, 150, 243, 0.15)",
											transition: "all 0.3s ease-in-out",
											"&:hover": {
												transform: "translateY(-4px)",
												boxShadow: (theme) =>
													theme.palette.mode === "dark"
														? "0 8px 20px rgba(33, 150, 243, 0.3)"
														: "0 8px 20px rgba(33, 150, 243, 0.25)",
											},
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main", mb: 0.5 }}>
											{quizResults.data?.accuracy || 0}%
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Accuracy
										</Typography>
									</Card>
								</Grid>
							</Grid>

							{/* Navigation Buttons */}
							<Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3, flexWrap: "wrap" }}>
								<StyledButton
									variant="contained"
									size="medium"
									onClick={() => navigate(-1)}
									sx={{
										px: 3,
										py: 1,
										fontSize: "0.9rem",
										fontWeight: 600,
									}}
								>
									Back to Chapters
								</StyledButton>

							</Box>
						</CardContent>
					</QuestionCard>
				</Box>
			) : (
				question && (
					<>
						<QuestionCard>
							<CardContent sx={quizStyles.questionCardContent}>
								<Typography variant="h6" sx={quizStyles.questionTitle}>
									{question.ques}
								</Typography>
							</CardContent>
						</QuestionCard>

						<Grid container spacing={3} sx={{ mt: 2 }}>
							{question.options?.map((opt, idx) => (
								<Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
									<OptionCard
										selected={selectedAnswer === idx}
										className={
											result
												? idx === result.correctIndex
													? "correct-answer"
													: idx === selectedAnswer
													? result.isCorrect
														? "correct"
														: "wrong"
													: ""
												: selectedAnswer === idx
												? "selected"
												: ""
										}
										onClick={() => (result ? null : setSelectedAnswer(idx))}
									>
										<CardContent>
											<Typography variant="subtitle1" align="center">
												{opt}
											</Typography>
										</CardContent>
									</OptionCard>
								</Grid>
							))}
						</Grid>
              {/* Debug Info Box */}
						<Box
							sx={{
								position: "fixed",
								right: 16,
								bottom: 16,
								bgcolor: "background.paper",
								boxShadow: 6,
								borderRadius: 2,
								p: 1.5,
								zIndex: 1400,
								display: "flex",
								justifyContent: "space-between",
								gap: 1,
								fontSize: "0.75rem",
								maxWidth: 360,
								flexWrap: "wrap",
							}}
						>
							<Typography variant="body2" title={question?.correctAnswer?.join(", ") || "-"}>
								Correct Index (0 - 3): {question?.correctAnswer?.join(", ") || "-"}
							</Typography>

							<Typography
								variant="body2"
								title={question?.trueskill ? JSON.stringify(question.trueskill) : "-"}
								sx={{
									fontFamily:
										'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace',
								 whiteSpace: 'pre-wrap', // allow wrapping
    wordBreak: 'break-word', // break long words
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
							>
								UserChapterTS: <br />
								Mu: {question.trueskill.mu},<br />
								Sigma: {question.trueskill.sigma}
							</Typography>

							<Typography
								variant="body2"
								title={
									question?.questionTrueskill
										? JSON.stringify(question.questionTrueskill)
										: "-"
								}
								sx={{
									fontFamily:
										'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace',
									 whiteSpace: 'pre-wrap', // allow wrapping
    wordBreak: 'break-word', // break long words
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
							>
								QuestionTS:{" "}
								{question.questionTrueskill ? (
									<>
										<br />
										Mu: {question.questionTrueskill.mu},<br />
										Sigma: {question.questionTrueskill.sigma}
									</>
								) : (
									"-"
								)}
							</Typography>
						</Box>
						<Box sx={{ mt: 4, display: "flex", justifyContent: "center", gap: 2 }}>
							{!result ? (
								<StyledButton
									variant="contained"
									size="large"
									onClick={submitAnswer}
									disabled={selectedAnswer === null || isLoading}
									sx={{
										backgroundColor: (theme) =>
											theme.palette.mode === "dark" ? "#444" : "#1F1F1F",
										color: (theme) => (theme.palette.mode === "dark" ? "white" : "white"),
									}}
								>
									Submit Answer
								</StyledButton>
							) : (
								<StyledButton
									variant="contained"
									size="large"
									onClick={nextQuestion}
									disabled={isLoading}
								>
									Next Question
								</StyledButton>
							)}
						</Box>
					</>
				)
			)}
			<MaxScoreNotification 
				show={showMaxScore} 
				maxScore={maxScoreValue} 
				onClose={() => setShowMaxScore(false)} 
			/>
		</Box>
	);
};

export default Quiz;
