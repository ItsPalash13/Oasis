import React, { useEffect, useState, useRef, useCallback } from "react";
import { Box, Card, CardContent, CircularProgress, Grid, Typography, IconButton, Drawer, Collapse, Chip } from "@mui/material";
import { QuizHeader, QuestionCard, OptionCard, StyledButton, XpDisplay, quizStyles } from "../../theme/quizTheme";
import { ArrowBack as ArrowBackIcon, Star as StarIcon, BookmarkBorder, Bookmark, ChevronRight, ChevronLeft, BugReport, Close, CheckBox, RadioButtonChecked } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import DOMPurify from 'dompurify';
import { renderTextWithLatex } from "../../utils/quesUtils";
import QuestionPalette from "./QuestionPalette";

const Quiz = ({ socket }) => {
	const navigate = useNavigate();
	const { quizId } = useParams();
	const quizSession = useSelector((state) => state?.quizSession?.session);
	const sessionId = quizSession?.id || quizId;
	const [isLoading, setIsLoading] = useState(true);
	const [questions, setQuestions] = useState([]);
	const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: answerIndex | answerIndex[] }
	const [quizSubmitted, setQuizSubmitted] = useState(false);
	const [quizResults, setQuizResults] = useState(null);
	const [currentScore, setCurrentScore] = useState(0);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [questionStates, setQuestionStates] = useState([]); // Array of {visited, answered, markedForReview}
	const questionRefs = useRef([]);
	const [paletteOpen, setPaletteOpen] = useState(true);
	const [paletteWidth, setPaletteWidth] = useState(350);
	const [debugBoxOpen, setDebugBoxOpen] = useState(false); // TEMPORARY: Debug box visibility state

	// Connect and fetch all questions
	useEffect(() => {
		if (!socket.connected) {
			socket.connect();
		}
		const onConnect = () => {
			console.log("SOCKET INITIATE V3 SOCKET ID :", sessionId);
			socket.emit("initiate", { sessionId });
		};
		
		const onQuestions = (data) => {
			console.log("Received questions V3:", data);
			const questionsList = data.questions || [];
			setQuestions(questionsList);
			setSelectedAnswers({});
			
			// Initialize question states
			const initialStates = questionsList.map(() => ({
				visited: false,
				answered: false,
				markedForReview: false,
			}));
			
			// Mark first question as visited
			if (initialStates.length > 0) {
				initialStates[0].visited = true;
			}
			
			setQuestionStates(initialStates);
			
			// Initialize refs array
			questionRefs.current = questionsList.map((_, i) => {
				if (!questionRefs.current[i]) {
					questionRefs.current[i] = React.createRef();
				}
				return questionRefs.current[i];
			});
			
			setIsLoading(false);
			if (data.currentScore !== undefined) {
				setCurrentScore(data.currentScore);
			}
		};

		const onResults = (data) => {
			console.log("Received results V3:", data);
			setQuizSubmitted(true);
			setQuizResults(data);
			setIsLoading(false);
		};

		const onQuizError = (data) => {
			console.error("Quiz error V3:", data);
			setIsLoading(false);
		};

		socket.on("connect", onConnect);
		socket.on("questions", onQuestions);
		socket.on("results", onResults);
		socket.on("quizError", onQuizError);

		return () => {
			socket.off("connect", onConnect);
			socket.off("questions", onQuestions);
			socket.off("results", onResults);
			socket.off("quizError", onQuizError);
			if (socket.connected) socket.disconnect();
		};
	}, [socket, quizId, sessionId]);

	const handleAnswerSelect = (questionId, answerIndex) => {
		if (quizSubmitted) return; // Don't allow changes after submission
		
		const question = questions.find(q => q.id === questionId);
		const isMulticorrect = question?.type === 'multicorrect';
		
		setSelectedAnswers(prev => {
			if (isMulticorrect) {
				// For multicorrect: toggle the selection
				const currentAnswers = prev[questionId] || [];
				const currentArray = Array.isArray(currentAnswers) ? currentAnswers : (currentAnswers !== null && currentAnswers !== undefined ? [currentAnswers] : []);
				
				const newAnswers = currentArray.includes(answerIndex)
					? currentArray.filter(idx => idx !== answerIndex) // Remove if already selected
					: [...currentArray, answerIndex]; // Add if not selected
				
				return {
					...prev,
					[questionId]: newAnswers.length > 0 ? newAnswers : null
				};
			} else {
				// For single: replace the selection
				return {
					...prev,
					[questionId]: answerIndex
				};
			}
		});
		
		// Update answered state
		const questionIndex = questions.findIndex(q => q.id === questionId);
		if (questionIndex !== -1) {
			setQuestionStates(prev => {
				const newStates = [...prev];
				if (newStates[questionIndex]) {
					newStates[questionIndex] = {
						...newStates[questionIndex],
						answered: true,
					};
				}
				return newStates;
			});
		}
	};

	const handleQuestionNavigate = useCallback((index) => {
		if (index < 0 || index >= questions.length) return;
		
		setCurrentQuestionIndex(index);
		
		// Mark as visited
		setQuestionStates(prev => {
			const newStates = [...prev];
			if (newStates[index]) {
				newStates[index] = {
					...newStates[index],
					visited: true,
				};
			}
			return newStates;
		});
		
		// Scroll to question
		if (questionRefs.current[index]?.current) {
			questionRefs.current[index].current.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		}
	}, [questions.length]);

	const handleMarkForReview = (questionId) => {
		if (quizSubmitted) return;
		
		const questionIndex = questions.findIndex(q => q.id === questionId);
		if (questionIndex !== -1) {
			setQuestionStates(prev => {
				const newStates = [...prev];
				if (newStates[questionIndex]) {
					newStates[questionIndex] = {
						...newStates[questionIndex],
						markedForReview: !newStates[questionIndex].markedForReview,
					};
				}
				return newStates;
			});
		}
	};

	// Mark current question as visited when it changes
	useEffect(() => {
		if (questions.length === 0 || quizSubmitted) return;
		
		setQuestionStates(prev => {
			const newStates = [...prev];
			if (newStates[currentQuestionIndex] && !newStates[currentQuestionIndex].visited) {
				newStates[currentQuestionIndex] = {
					...newStates[currentQuestionIndex],
					visited: true,
				};
				return newStates;
			}
			return prev;
		});
	}, [currentQuestionIndex, questions.length, quizSubmitted]);

	const handleSubmit = () => {
		if (questions.length === 0) return;
		
		// Check if at least one question is answered
		const answeredCount = Object.values(selectedAnswers).filter(a => 
			a !== null && 
			a !== undefined && 
			!(Array.isArray(a) && a.length === 0)
		).length;
		if (answeredCount === 0) {
			alert("Please answer at least one question before submitting.");
			return;
		}

		if (window.confirm(`You have answered ${answeredCount} out of ${questions.length} questions. Submit now?`)) {
			setIsLoading(true);
			
			// Prepare answers array
			const answers = questions.map(q => {
				const answer = selectedAnswers[q.id];
				// For multicorrect, ensure it's an array; for single, ensure it's a number or null
				if (q.type === 'multicorrect') {
					return {
						questionId: q.id,
						answerIndex: Array.isArray(answer) ? answer : (answer !== null && answer !== undefined ? [answer] : null)
					};
				} else {
					return {
						questionId: q.id,
						answerIndex: Array.isArray(answer) ? answer[0] : (answer ?? null)
					};
				}
			});

			socket.emit("submit", { answers, sessionId });
		}
	};

	const handleBack = () => {
		if (window.confirm("Are you sure you want to leave? Your progress will be saved.")) {
			navigate(-1);
		}
	};

	return (
		<Box sx={{ p: 2, overflowX: "hidden", width: "100%" }}>
			<QuizHeader>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					{!quizSubmitted && (
						<StyledButton
							variant="outlined"
							size="small"
							onClick={handleBack}
							sx={quizStyles.backButton}
						>
							<ArrowBackIcon fontSize="small" />
						</StyledButton>
					)}
				</Box>
				{!quizSubmitted && questions.length > 0 && (
					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						<StyledButton
							variant="contained"
							size="medium"
							onClick={handleSubmit}
							disabled={isLoading}
							sx={{
								px: 3,
								py: 1,
								fontSize: "0.9rem",
								fontWeight: 600,
							}}
						>
							Submit Quiz 
						</StyledButton>
					</Box>
				)}
			</QuizHeader>

			{isLoading && !quizSubmitted ? (
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
					<CircularProgress />
				</Box>
			) : quizSubmitted && quizResults ? (
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
										color: "primary.main",
									}}
								>
									🎯
								</Typography>
								<Typography
									variant="h6"
									sx={{
										fontWeight: "bold",
										mb: 1,
										color: "primary.main",
									}}
								>
									Quiz Completed!
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
									Great effort! Here's how you performed.
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
											{quizResults.currentScore || 0}
										</Typography>
										<Typography variant="body1" sx={{ fontWeight: "bold", opacity: 0.9 }}>
											Total XP
										</Typography>
									</Box>
								</XpDisplay>
							</Box>

							{/* Stats Grid */}
							<Grid container spacing={2} sx={{ mb: 3 }}>
								<Grid size={{ xs: 6, sm: 3 }}>
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
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", color: "success.main", mb: 0.5 }}>
											{quizResults.questionsCorrect || 0}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Correct
										</Typography>
									</Card>
								</Grid>
								<Grid size={{ xs: 6, sm: 3 }}>
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
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", color: "error.main", mb: 0.5 }}>
											{quizResults.questionsIncorrect || 0}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Incorrect
										</Typography>
									</Card>
								</Grid>
								<Grid size={{ xs: 6, sm: 3 }}>
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
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
											{quizResults.questionsAttempted || 0}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Attempted
										</Typography>
									</Card>
								</Grid>
								<Grid size={{ xs: 6, sm: 3 }}>
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
										}}
									>
										<Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main", mb: 0.5 }}>
											{quizResults.accuracy || 0}%
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
											Accuracy
										</Typography>
									</Card>
								</Grid>
							</Grid>

							{/* Navigation Button */}
							<Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}>
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
				<Box sx={{ display: "flex", gap: 2, mt: 3, position: "relative", width: "100%", overflowX: "hidden" }}>
					{/* Main Content Area */}
					<Box 
						sx={{ 
							flex: 1,
							minWidth: 0, // Prevents flex item from overflowing
							maxWidth: paletteOpen ? `calc(100% - ${paletteWidth + 16}px)` : "100%",
							transition: "max-width 0.3s ease",
							mx: "auto",
							overflowX: "hidden",
						}}
					>
						{/* Single Question Display */}
						{questions.length > 0 && currentQuestionIndex < questions.length && (
						<Box 
							ref={questionRefs.current[currentQuestionIndex]}
							sx={{ mb: 4 }}
						>
							{(() => {
								const question = questions[currentQuestionIndex];
								const questionIndex = currentQuestionIndex;
								const currentAnswer = selectedAnswers[question.id];
								const isMulticorrect = question.type === 'multicorrect';
								
								// Determine if answer is correct (for display purposes)
								let isCorrect = false;
								let isIncorrect = false;
								if (quizResults && currentAnswer !== null && currentAnswer !== undefined) {
									if (isMulticorrect) {
										const userAnswers = Array.isArray(currentAnswer) ? currentAnswer : [currentAnswer];
										const correctAnswers = question.correctAnswer || [];
										const userSorted = [...userAnswers].sort((a, b) => a - b);
										const correctSorted = [...correctAnswers].sort((a, b) => a - b);
										isCorrect = userSorted.length === correctSorted.length &&
											userSorted.every((val, idx) => val === correctSorted[idx]);
										isIncorrect = !isCorrect;
									} else {
										isCorrect = question.correctAnswer?.includes(currentAnswer);
										isIncorrect = !isCorrect;
									}
								}
								
								return (
									<>
										<QuestionCard>
											<CardContent sx={quizStyles.questionCardContent}>
												<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
															Question {questionIndex + 1} of {questions.length}
														</Typography>
														{isMulticorrect ? (
															<Chip
																icon={<CheckBox sx={{ fontSize: "0.875rem" }} />}
																label="Multiple Correct"
																size="small"
																sx={{
																	height: "24px",
																	fontSize: "0.7rem",
																	fontWeight: 600,
																	backgroundColor: (theme) =>
																		theme.palette.mode === "dark" 
																			? "rgba(33, 150, 243, 0.2)" 
																			: "rgba(33, 150, 243, 0.1)",
																	color: "primary.main",
																	border: "1px solid",
																	borderColor: "primary.main",
																	"& .MuiChip-icon": {
																		color: "primary.main",
																	},
																}}
															/>
														) : (
															<Chip
																icon={<RadioButtonChecked sx={{ fontSize: "0.875rem" }} />}
																label="Single Correct"
																size="small"
																sx={{
																	height: "24px",
																	fontSize: "0.7rem",
																	fontWeight: 600,
																	backgroundColor: (theme) =>
																		theme.palette.mode === "dark" 
																			? "rgba(156, 39, 176, 0.2)" 
																			: "rgba(156, 39, 176, 0.1)",
																	color: "secondary.main",
																	border: "1px solid",
																	borderColor: "secondary.main",
																	"& .MuiChip-icon": {
																		color: "secondary.main",
																	},
																}}
															/>
														)}
													</Box>
													{!quizSubmitted && (
														<IconButton
															size="small"
															onClick={() => handleMarkForReview(question.id)}
															sx={{
																color: questionStates[questionIndex]?.markedForReview ? "#9C27B0" : "text.secondary",
															}}
														>
															{questionStates[questionIndex]?.markedForReview ? (
																<Bookmark sx={{ color: "#9C27B0" }} />
															) : (
																<BookmarkBorder />
															)}
														</IconButton>
													)}
												</Box>
												{question.quesType === 'html' ? (
													<Typography 
														variant="h6" 
														sx={quizStyles.questionTitle}
														dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.ques || '') }}
													/>
												) : (
													<Typography variant="h6" sx={quizStyles.questionTitle}>
														{renderTextWithLatex(question.ques)}
													</Typography>
												)}
											</CardContent>
										</QuestionCard>

										<Grid container spacing={3} sx={{ mt: 2 }}>
											{question.options?.map((opt, idx) => {
												const currentAnswer = selectedAnswers[question.id];
												const isMulticorrect = question.type === 'multicorrect';
												const isSelected = isMulticorrect
													? Array.isArray(currentAnswer) && currentAnswer.includes(idx)
													: currentAnswer === idx;
												const isCorrectAnswer = question.correctAnswer?.includes(idx);
												let className = "";
												
												if (quizSubmitted && quizResults) {
													if (isCorrectAnswer) {
														className = "correct-answer";
													} else if (isSelected && !isCorrectAnswer) {
														className = "wrong";
													}
												} else if (isSelected) {
													className = "selected";
												}

												return (
													<Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
														<OptionCard
															selected={isSelected}
															className={className}
															onClick={() => handleAnswerSelect(question.id, idx)}
														>
															<CardContent>
																{question.optionsType === 'html' ? (
																	<Typography 
																		variant="subtitle1" 
																		align="center"
																		sx={{
																			wordBreak: 'break-word',
																			'& *': {
																				maxWidth: '100%'
																			}
																		}}
																		dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt || '') }}
																	/>
																) : (
																	<Typography 
																		variant="subtitle1" 
																		align="center"
																		sx={{
																			whiteSpace: 'pre-wrap',
																			wordBreak: 'break-word',
																			'& .katex': {
																				fontSize: '1em'
																			}
																		}}
																	>
																		{renderTextWithLatex(opt)}
																	</Typography>
																)}
															</CardContent>
														</OptionCard>
													</Grid>
												);
											})}
										</Grid>

										{/* Navigation Buttons */}
										{!quizSubmitted && (
											<Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, mb: 4 }}>
												<StyledButton
													variant="outlined"
													size="large"
													onClick={() => handleQuestionNavigate(Math.max(0, currentQuestionIndex - 1))}
													disabled={currentQuestionIndex === 0}
													sx={{
														px: 4,
														py: 1.5,
														fontSize: "1rem",
														fontWeight: 600,
													}}
												>
													Previous
												</StyledButton>
												
												<StyledButton
													variant="contained"
													size="large"
													onClick={() => handleQuestionNavigate(Math.min(questions.length - 1, currentQuestionIndex + 1))}
													disabled={currentQuestionIndex === questions.length - 1}
													sx={{
														px: 4,
														py: 1.5,
														fontSize: "1rem",
														fontWeight: 600,
													}}
												>
													Next
												</StyledButton>
											</Box>
										)}
									</>
								);
							})()}
						</Box>
						)}
					</Box>

					{/* Right Panel - Question Palette */}
					{questions.length > 0 && !quizSubmitted && (
						<>
							<Drawer
								anchor="right"
								open={paletteOpen}
								variant="persistent"
								sx={{
									width: paletteOpen ? paletteWidth : 0,
									flexShrink: 0,
									overflow: "hidden",
                                    borderRadius:3,
									"& .MuiDrawer-paper": {
										width: paletteWidth,
										boxSizing: "border-box",
										position: "relative",
										height: "auto",
										backgroundColor: (theme) => 
											theme.palette.mode === "dark" ? "#1A1A1A" : "#FAFAFA",
										overflowX: "hidden",
									},
								}}
							>
								<Box sx={{ p: 2, pt: 5, height: "100%", overflowY: "auto", position: "relative" }}>
									{/* Toggle Button - Inside drawer, top right, only when open */}
									{paletteOpen && (
										<IconButton
											onClick={() => setPaletteOpen(false)}
											sx={{
												position: "absolute",
												top: 8,
												right: 8,
												zIndex: 10,
												padding: 0.5,
												minWidth: "32px",
												width: "32px",
												height: "32px",
											}}
										>
											<ChevronRight />
										</IconButton>
									)}
									<QuestionPalette
										currentIndex={currentQuestionIndex}
										questionStates={questionStates}
										onNavigate={handleQuestionNavigate}
										totalQuestions={questions.length}
									/>
								</Box>
							</Drawer>
							
							{/* Toggle Button - When panel is closed, show on right edge */}
							{!paletteOpen && (
								<IconButton
									onClick={() => setPaletteOpen(true)}
									sx={{
										position: "fixed",
										right: "0px",
										top: "50%",
										transform: "translateY(-50%)",
										zIndex: 1300,
										minWidth: "40px",
										width: "40px",
										height: "40px",
										backgroundColor: (theme) => 
											theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF",
										border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
										borderLeft: (theme) => `1px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
										borderRadius: "8px 0 0 8px",
										boxShadow: 3,
										"&:hover": {
											backgroundColor: (theme) => 
												theme.palette.mode === "dark" ? "#2A2A2A" : "#F5F5F5",
										},
									}}
								>
									<ChevronLeft />
								</IconButton>
							)}
						</>
					)}
				</Box>
			)}

			{/* TEMPORARY: Debug helper box - shows current question answer and TrueSkill data */}
			{questions.length > 0 && !quizSubmitted && questions[currentQuestionIndex] && (
				<>
					{/* Toggle Button - Show only when debug box is closed */}
					{!debugBoxOpen && (
						<IconButton
							onClick={() => setDebugBoxOpen(true)}
							sx={{
								position: "fixed",
								bottom: 16,
								right: 16,
								zIndex: 1401,
								backgroundColor: (theme) =>
									theme.palette.mode === "dark" ? "rgba(26, 26, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
								border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
								boxShadow: 3,
								"&:hover": {
									backgroundColor: (theme) =>
										theme.palette.mode === "dark" ? "rgba(40, 40, 40, 0.95)" : "rgba(245, 245, 245, 0.95)",
								},
							}}
						>
							<BugReport />
						</IconButton>
					)}

					{/* Debug Box - Conditionally rendered */}
					{debugBoxOpen && (
						<Box
							sx={{
								position: "fixed",
								bottom: 16,
								right: 16,
								width: 300,
								maxHeight: 400,
								overflowY: "auto",
								backgroundColor: (theme) =>
									theme.palette.mode === "dark" ? "rgba(26, 26, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
								border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
								borderRadius: 2,
								p: 2,
								pt: 4, // Add padding top for close button
								boxShadow: 6,
								zIndex: 1400,
							}}
						>
							{/* Close Button - Inside the box, top right */}
							<IconButton
								onClick={() => setDebugBoxOpen(false)}
								sx={{
									position: "absolute",
									top: 8,
									right: 8,
									zIndex: 10,
									padding: 0.5,
									minWidth: "32px",
									width: "32px",
									height: "32px",
								}}
							>
								<Close />
							</IconButton>

							<Typography
								variant="caption"
								sx={{
									fontWeight: "bold",
									color: "warning.main",
									mb: 1,
									display: "block",
								}}
							>
								[TEMPORARY DEV DEBUG]
							</Typography>
							<Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
								Question {currentQuestionIndex + 1}
							</Typography>
							
							{/* Correct Answer */}
							<Box sx={{ mb: 1.5 }}>
								<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
									Correct Answer:
								</Typography>
								<Typography variant="body2" sx={{ fontWeight: "bold", color: "success.main" }}>
									{questions[currentQuestionIndex].correctAnswer
										? Array.isArray(questions[currentQuestionIndex].correctAnswer)
											? questions[currentQuestionIndex].correctAnswer.join(", ")
											: questions[currentQuestionIndex].correctAnswer
										: "N/A"}
								</Typography>
							</Box>

							{/* User TrueSkill */}
							<Box sx={{ mb: 1.5 }}>
								<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
									User TrueSkill:
								</Typography>
								{questions[currentQuestionIndex].trueskill ? (
									<>
										<Typography variant="body2">
											μ: {questions[currentQuestionIndex].trueskill.mu?.toFixed(2) || "N/A"}
										</Typography>
										<Typography variant="body2">
											σ: {questions[currentQuestionIndex].trueskill.sigma?.toFixed(2) || "N/A"}
										</Typography>
									</>
								) : (
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Not available
									</Typography>
								)}
							</Box>

							{/* Question TrueSkill */}
							<Box sx={{ mb: 1 }}>
								<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
									Question TrueSkill:
								</Typography>
								{questions[currentQuestionIndex].questionTrueskill ? (
									<>
										<Typography variant="body2">
											μ: {questions[currentQuestionIndex].questionTrueskill.mu?.toFixed(2) || "N/A"}
										</Typography>
										<Typography variant="body2">
											σ: {questions[currentQuestionIndex].questionTrueskill.sigma?.toFixed(2) || "N/A"}
										</Typography>
									</>
								) : (
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Not available
									</Typography>
								)}
							</Box>
						</Box>
					)}
				</>
			)}
		</Box>
	);
};

export default Quiz;

