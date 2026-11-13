import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api, formatCurrency, formatDate, jsonBody } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import SiteLayout from "../components/SiteLayout.jsx";
import { Alert, EmptyState, FormField, Loading, PageTitle } from "../components/Shared.jsx";

function destination(user) {
  return user?.role === "developer" ? "/dashboard/developer" : "/dashboard/freelancer";
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={destination(user)} replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Work better, together</span>
          <h1>Make your next<br /><span>great connection.</span></h1>
          <p>GiG Matrix brings ambitious teams and talented freelancers together. Find meaningful work or meet the people who can move your project forward.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/jobs">Explore opportunities <span aria-hidden="true">→</span></Link>
            <Link className="button button-outline" to={user ? destination(user) : "/signup"}>{user ? "Go to dashboard" : "Join GiG Matrix"}</Link>
          </div>
          <div className="hero-proof"><span className="proof-dot" /> A better way to find your next gig</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-card hero-card-main"><span className="card-icon">✦</span><strong>Good work<br />starts here.</strong><small>People · Ideas · Opportunity</small></div>
          <div className="hero-card hero-card-float"><span className="avatar-stack">GM</span><span><strong>Great teams</strong><small>Built on trust</small></span><b>↗</b></div>
          <span className="hero-sparkle sparkle-one">✳</span><span className="hero-sparkle sparkle-two">✦</span>
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading"><span className="eyebrow">A platform for both sides</span><h2>Bring your next idea to life.</h2><p>Whether you’re building a business or a freelance career, your next step starts here.</p></div>
        <div className="choice-grid">
          <article className="choice-card"><span className="choice-icon">⌘</span><h3>For businesses</h3><p>Share your project, meet skilled independent professionals, and build the right team for the work.</p><Link to={user?.role === "developer" ? "/jobs/new" : "/signup"}>Post a project <span>→</span></Link></article>
          <article className="choice-card"><span className="choice-icon choice-icon-alt">✳</span><h3>For freelancers</h3><p>Discover opportunities that match your skills, share your experience, and grow your independent career.</p><Link to="/jobs">Find your next gig <span>→</span></Link></article>
        </div>
      </section>
      <section className="home-cta"><div><span className="eyebrow">Make it happen</span><h2>Find the work that moves you.</h2><p>Discover projects and connect with people who value what you do.</p></div><Link className="button button-primary" to="/jobs">Browse open jobs <span>→</span></Link></section>
    </>
  );
}

function Signup() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: "", email: "", password: "", confirmPassword: "", role: "freelancer" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={destination(user)} replace />;
  const update = (event) => setValues({ ...values, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (values.password !== values.confirmPassword) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await api("/auth/signup", { method: "POST", body: jsonBody(values) });
      const current = await refreshUser();
      navigate(destination(current), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return <AuthPage title="Create your account" subtitle="Join our community and find your next opportunity.">
    <form className="form-stack" onSubmit={submit}>
      <FormField label="Full name"><input name="username" value={values.username} onChange={update} autoComplete="name" required minLength="2" /></FormField>
      <FormField label="Email address"><input name="email" type="email" value={values.email} onChange={update} autoComplete="email" required /></FormField>
      <FormField label="Password"><input name="password" type="password" value={values.password} onChange={update} autoComplete="new-password" minLength="6" required /></FormField>
      <FormField label="Confirm password"><input name="confirmPassword" type="password" value={values.confirmPassword} onChange={update} autoComplete="new-password" minLength="6" required /></FormField>
      <FormField label="I’m joining as"><select name="role" value={values.role} onChange={update}><option value="freelancer">Freelancer</option><option value="developer">Business / project owner</option></select></FormField>
      <Alert error={error} />
      <button className="button button-primary button-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthPage>;
}

function Login() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={destination(user)} replace />;
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/auth/login", { method: "POST", body: jsonBody(values) });
      const current = await refreshUser();
      navigate(destination(current), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return <AuthPage title="Welcome back" subtitle="Sign in to continue to your account.">
    <form className="form-stack" onSubmit={submit}>
      <FormField label="Email address"><input type="email" autoComplete="email" required value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></FormField>
      <FormField label="Password"><input type="password" autoComplete="current-password" required value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /></FormField>
      <div className="form-trailing"><Link to="/forgot-password">Forgot password?</Link></div>
      <Alert error={error} />
      <button className="button button-primary button-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="auth-switch">New to GiG Matrix? <Link to="/signup">Create an account</Link></p>
  </AuthPage>;
}

function AuthPage({ title, subtitle, children }) {
  return <div className="auth-wrap"><section className="auth-card"><Link className="brand auth-brand" to="/">GiG <span>Matrix</span></Link><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}</section></div>;
}

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    try {
      const result = await api("/auth/forgot-password", { method: "POST", body: jsonBody({ email }) });
      setSuccess(result.message);
      navigate(`/reset-password?email=${encodeURIComponent(email)}`, { state: { message: result.message } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return <AuthPage title="Reset your password" subtitle="We’ll send a one-time code to the email address on your account.">
    <form className="form-stack" onSubmit={submit}>
      <FormField label="Email address"><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></FormField>
      <Alert error={error} success={success} />
      <button className="button button-primary button-full" disabled={busy}>{busy ? "Sending…" : "Send reset code"}</button>
    </form>
    <p className="auth-switch"><Link to="/login">← Back to sign in</Link></p>
  </AuthPage>;
}

function ResetPassword() {
  const [params] = useSearchParams();
  const [values, setValues] = useState({ email: params.get("email") || "", otp: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    try {
      const result = await api("/auth/reset-password", { method: "POST", body: jsonBody(values) });
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return <AuthPage title="Choose a new password" subtitle="Enter the six-digit code from your email.">
    <form className="form-stack" onSubmit={submit}>
      <FormField label="Email address"><input type="email" required value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></FormField>
      <FormField label="6-digit reset code"><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={values.otp} onChange={(event) => setValues({ ...values, otp: event.target.value })} /></FormField>
      <FormField label="New password"><input type="password" minLength="6" required value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /></FormField>
      <FormField label="Confirm new password"><input type="password" minLength="6" required value={values.confirmPassword} onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })} /></FormField>
      <Alert error={error} success={success} />
      {success ? <Link className="button button-primary button-full centered" to="/login">Go to sign in</Link> : <button className="button button-primary button-full" disabled={busy}>{busy ? "Updating…" : "Reset password"}</button>}
    </form>
    <p className="auth-switch"><Link to="/forgot-password">Request another code</Link></p>
  </AuthPage>;
}

function Dashboard() {
  const { user } = useAuth();
  const developer = user.role === "developer";
  const links = developer
    ? [["/jobs/new", "Post a job", "Share a new opportunity with freelancers."], ["/my-jobs", "My jobs", "Manage your listings and review applicants."], ["/applications", "Applications", "See who has applied to your projects."]]
    : [["/jobs", "Find jobs", "Explore projects that fit your skills."], ["/my-applications", "My applications", "Keep track of your submitted applications."], ["/profile", "Build your profile", "Show clients what you can bring to a project."]];
  return <>
    <section className="dashboard-hero">
      <div><span className="eyebrow">{developer ? "Business dashboard" : "Freelancer dashboard"}</span><h1>Welcome, {user.username.split(" ")[0]}.</h1><p>{developer ? "Bring your next project to life with the right people." : "Your next great opportunity could be just around the corner."}</p></div>
      <div className="dashboard-mark">{developer ? "⌘" : "✳"}</div>
    </section>
    <div className="dashboard-grid">{links.map(([to, title, description]) => <Link className="dashboard-card" to={to} key={to}><span className="card-arrow">↗</span><h2>{title}</h2><p>{description}</p><span className="text-link">Open section <b>→</b></span></Link>)}</div>
    <section className="dashboard-bottom"><div><span className="eyebrow">Stay connected</span><h2>Good work is a conversation.</h2><p>Keep in touch with the people you work with through your GiG Matrix messages.</p></div><Link className="button button-outline" to="/messages">View messages</Link></section>
  </>;
}

function BrowseJobs() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (category) query.set("category", category);
      setLoading(true);
      api(`/jobs?${query}`)
        .then((result) => { setJobs(result.jobs); setError(""); })
        .catch((requestError) => setError(requestError.message))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(timer);
  }, [search, category]);
  return <>
    <PageTitle eyebrow="Find your next gig" title="Open opportunities" description="Explore projects and connect with the people behind them." />
    <section className="filter-bar">
      <label className="search-input"><span aria-hidden="true">⌕</span><input aria-label="Search jobs" placeholder="Search by title, description, or skill" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option><option value="web">Web development</option><option value="mobile">Mobile development</option><option value="design">Design</option><option value="marketing">Marketing</option></select>
    </section>
    <Alert error={error} />
    {loading ? <Loading /> : jobs.length ? <div className="job-grid">{jobs.map((job) => <JobCard key={job._id} job={job} user={user} />)}</div> : <EmptyState title="No jobs found" detail="Try changing your search or check back for new opportunities." action={<button className="button button-outline" onClick={() => { setSearch(""); setCategory(""); }}>Clear filters</button>} />}
  </>;
}

function JobCard({ job, user }) {
  return <article className="job-card">
    <div className="job-card-top"><span className="category-label">{job.category || "Project"}</span><span className="job-date">{formatDate(job.createdAt)}</span></div>
    <h2><Link to={`/jobs/${job._id}`}>{job.title}</Link></h2>
    <p className="job-company">Posted by {job.developer?.username || "GiG Matrix member"}</p>
    <p className="job-description">{job.description}</p>
    <div className="skill-list">{(job.requiredSkills || []).slice(0, 5).map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div>
    <div className="job-card-bottom"><strong>{formatCurrency(job.budget)} <small>budget</small></strong><Link className="text-link" to={`/jobs/${job._id}`}>{user?.role === "freelancer" ? "View & apply" : "View details"} <b>→</b></Link></div>
  </article>;
}

function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({ phone: "", coverLetter: "" });
  const [resume, setResume] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api(`/jobs/${id}`).then((result) => setJob(result.job)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [id]);
  async function apply(event) {
    event.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    const body = new FormData();
    body.set("phone", values.phone);
    body.set("coverLetter", values.coverLetter);
    if (resume) body.set("resume", resume);
    try {
      const result = await api(`/jobs/${id}/applications`, { method: "POST", body });
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (!job) return <EmptyState title="Job unavailable" detail={error || "This job may have been removed."} action={<Link className="button button-outline" to="/jobs">Back to jobs</Link>} />;
  const isOwner = user && String(job.developer?._id) === String(user._id);
  return <>
    <Link className="back-link" to="/jobs">← Back to jobs</Link>
    <div className="detail-layout">
      <article className="detail-card">
        <div className="detail-top"><span className="category-label">{job.category}</span><span className={`status-pill status-${job.status}`}>{job.status.replaceAll("_", " ")}</span></div>
        <h1>{job.title}</h1>
        <p className="job-company">Posted by {job.developer?.username || "GiG Matrix member"} · {formatDate(job.createdAt)}</p>
        <div className="detail-facts"><span><small>Budget</small><strong>{formatCurrency(job.budget)}</strong></span>{job.jobType && <span><small>Type</small><strong>{job.jobType}</strong></span>}{job.experienceLevel && <span><small>Experience</small><strong>{job.experienceLevel}</strong></span>}</div>
        <h2>About the project</h2><p className="detail-description">{job.description}</p>
        <h2>Skills needed</h2><div className="skill-list">{job.requiredSkills?.length ? job.requiredSkills.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>) : <span className="muted">No specific skills listed.</span>}</div>
        {isOwner && <div className="owner-actions"><Link className="button button-outline" to={`/my-jobs/${job._id}/edit`}>Edit job</Link><Link className="button button-primary" to="/applications">View applications</Link></div>}
      </article>
      {user?.role === "freelancer" && job.status === "open" && <aside className="apply-card"><h2>Interested in this project?</h2><p>Send the project owner a short introduction.</p><form className="form-stack" onSubmit={apply}>
        <FormField label="Phone (optional)"><input type="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></FormField>
        <FormField label="Cover letter"><textarea rows="6" value={values.coverLetter} onChange={(event) => setValues({ ...values, coverLetter: event.target.value })} placeholder="Tell them why you’re a good fit." /></FormField>
        <FormField label="Resume (PDF, DOC, DOCX; max 5 MB)"><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResume(event.target.files?.[0] || null)} /></FormField>
        <Alert error={error} success={success} />
        <button className="button button-primary button-full" disabled={busy || Boolean(success)}>{busy ? "Submitting…" : success ? "Application sent" : "Submit application"}</button>
      </form></aside>}
      {!user && <aside className="apply-card"><h2>Ready to apply?</h2><p>Sign in as a freelancer to send your application.</p><Link className="button button-primary button-full centered" to="/login">Sign in to apply</Link></aside>}
    </div>
  </>;
}

function PostJob({ edit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState({ title: "", description: "", budget: "", category: "web", requiredSkills: "", status: "open", experienceLevel: "", jobType: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!edit) return;
    api(`/jobs/${id}`).then(({ job }) => setValues({
      title: job.title, description: job.description, budget: job.budget, category: job.category,
      requiredSkills: (job.requiredSkills || []).join(", "), status: job.status,
      experienceLevel: job.experienceLevel || "", jobType: job.jobType || "",
    })).catch((requestError) => setError(requestError.message));
  }, [edit, id]);
  function update(event) { setValues({ ...values, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    const body = { ...values, budget: Number(values.budget), requiredSkills: values.requiredSkills.split(",").map((skill) => skill.trim()).filter(Boolean) };
    try {
      const result = await api(edit ? `/jobs/${id}` : "/jobs", { method: edit ? "PATCH" : "POST", body: jsonBody(body) });
      navigate(edit ? `/jobs/${id}` : `/my-jobs`, { replace: true, state: { message: edit ? "Job updated." : "Job posted." } });
      return result;
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return <>
    <PageTitle eyebrow={edit ? "Manage project" : "Create an opportunity"} title={edit ? "Edit your job" : "Post a job"} description={edit ? "Update the details freelancers see." : "Tell freelancers about the project and skills you need."} />
    <form className="editor-card form-stack" onSubmit={submit}>
      <FormField label="Job title"><input name="title" value={values.title} onChange={update} required maxLength="255" placeholder="e.g. Frontend React Developer" /></FormField>
      <FormField label="Description"><textarea name="description" rows="8" value={values.description} onChange={update} required placeholder="Describe the work, deliverables, and what success looks like." /></FormField>
      <div className="form-row">
        <FormField label="Budget (USD)"><input name="budget" type="number" min="0.01" step="0.01" value={values.budget} onChange={update} required /></FormField>
        <FormField label="Category"><select name="category" value={values.category} onChange={update}><option value="web">Web development</option><option value="mobile">Mobile development</option><option value="design">Design</option><option value="marketing">Marketing</option><option value="other">Other</option></select></FormField>
      </div>
      <FormField label="Required skills (comma separated)"><input name="requiredSkills" value={values.requiredSkills} onChange={update} placeholder="React, JavaScript, CSS" /></FormField>
      <div className="form-row">
        <FormField label="Experience level"><select name="experienceLevel" value={values.experienceLevel} onChange={update}><option value="">Any level</option><option value="entry">Entry level</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option></select></FormField>
        <FormField label="Job type"><select name="jobType" value={values.jobType} onChange={update}><option value="">Choose a type</option><option value="full-time">Full time</option><option value="part-time">Part time</option><option value="contract">Contract</option></select></FormField>
      </div>
      {edit && <FormField label="Status"><select name="status" value={values.status} onChange={update}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="closed">Closed</option></select></FormField>}
      <Alert error={error} />
      <div className="form-actions"><Link className="button button-outline" to={edit ? `/jobs/${id}` : "/my-jobs"}>Cancel</Link><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : edit ? "Save changes" : "Publish job"}</button></div>
    </form>
  </>;
}

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/jobs/mine").then(({ jobs: data }) => setJobs(data)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }, []);
  async function remove(jobId) {
    if (!window.confirm("Delete this job and its applications? This cannot be undone.")) return;
    try {
      await api(`/jobs/${jobId}`, { method: "DELETE" });
      setJobs(jobs.filter((job) => job._id !== jobId));
    } catch (requestError) { setError(requestError.message); }
  }
  return <>
    <PageTitle eyebrow="Business dashboard" title="My jobs" description="Manage your open projects and see how many people have applied." action={<Link className="button button-primary" to="/jobs/new">＋ Post a job</Link>} />
    <Alert error={error} />
    {loading ? <Loading /> : jobs.length ? <div className="table-list">{jobs.map((job) => <article className="list-row" key={job._id}>
      <div className="list-row-main"><span className="category-label">{job.category}</span><h2><Link to={`/jobs/${job._id}`}>{job.title}</Link></h2><p>{formatCurrency(job.budget)} · {job.applicationCount || 0} application{job.applicationCount === 1 ? "" : "s"} · Posted {formatDate(job.createdAt)}</p></div>
      <div className="list-row-actions"><span className={`status-pill status-${job.status}`}>{job.status.replaceAll("_", " ")}</span><Link className="button button-outline small" to={`/my-jobs/${job._id}/edit`}>Edit</Link><button className="button button-danger small" onClick={() => remove(job._id)}>Delete</button></div>
    </article>)}</div> : <EmptyState title="No jobs posted yet" detail="Create a listing to start meeting independent talent." action={<Link className="button button-primary" to="/jobs/new">Post your first job</Link>} />}
  </>;
}

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/applications/mine").then(({ applications: data }) => setApplications(data)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }, []);
  return <>
    <PageTitle eyebrow="Freelancer dashboard" title="My applications" description="Track the projects you’ve applied to and their current status." action={<Link className="button button-outline" to="/jobs">Find more jobs</Link>} />
    <Alert error={error} />
    {loading ? <Loading /> : applications.length ? <div className="job-grid">{applications.map((application) => <article className="job-card application-card" key={application._id}>
      <div className="job-card-top"><span className="category-label">Applied {formatDate(application.createdAt)}</span><span className={`status-pill status-${application.status}`}>{application.status}</span></div>
      <h2><Link to={`/jobs/${application.job?._id}`}>{application.job?.title || "Project no longer available"}</Link></h2>
      <p className="job-company">By {application.job?.developer?.username || "GiG Matrix member"}</p>
      <p className="job-description">{application.job?.description || "The job listing is no longer available."}</p>
      <div className="job-card-bottom"><strong>{formatCurrency(application.job?.budget)} <small>budget</small></strong>{application.job?.developer?._id && <Link className="text-link" to={`/messages/${application.job.developer._id}`}>Message owner <b>→</b></Link>}</div>
    </article>)}</div> : <EmptyState title="No applications yet" detail="Browse open jobs and send an application to get started." action={<Link className="button button-primary" to="/jobs">Browse jobs</Link>} />}
  </>;
}

function ApplicationsReceived() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/applications/received").then(({ applications: data }) => setApplications(data)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }, []);
  async function setStatus(id, status) {
    try {
      const result = await api(`/applications/${id}`, { method: "PATCH", body: jsonBody({ status }) });
      setApplications(applications.map((application) => application._id === id ? { ...application, status: result.application.status } : application));
      setError("");
    } catch (requestError) { setError(requestError.message); }
  }
  return <>
    <PageTitle eyebrow="Business dashboard" title="Applications" description="Review freelancer applications to your projects." />
    <Alert error={error} />
    {loading ? <Loading /> : applications.length ? <div className="table-list">{applications.map((application) => <article className="applicant-row" key={application._id}>
      <div className="applicant-avatar">{application.freelancer?.username?.slice(0, 1).toUpperCase() || "F"}</div>
      <div className="applicant-content"><div className="applicant-head"><div><h2>{application.freelancer?.username || application.fullName}</h2><p>{application.freelancer?.email || application.email} · Applied to <Link to={`/jobs/${application.job?._id}`}>{application.job?.title}</Link></p></div><span className={`status-pill status-${application.status}`}>{application.status}</span></div><p className="cover-letter">{application.coverLetter || "No cover letter was included."}</p>
        <div className="applicant-actions">{application.resumePath && <a className="button button-outline small" href={application.resumePath} target="_blank" rel="noreferrer">View resume</a>}<Link className="button button-outline small" to={`/messages/${application.freelancer?._id}`}>Message freelancer</Link><label className="status-control">Update status <select value={application.status} onChange={(event) => setStatus(application._id, event.target.value)}><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></label></div>
      </div>
    </article>)}</div> : <EmptyState title="No applications received" detail="When freelancers apply to your jobs, their applications will appear here." action={<Link className="button button-primary" to="/jobs/new">Post a job</Link>} />}
  </>;
}

function Profile() {
  const [profile, setProfile] = useState(null);
  const [values, setValues] = useState({ fullName: "", bio: "", skills: "", experience: "", education: "", portfolioUrl: "", linkedinUrl: "", githubUrl: "" });
  const [picture, setPicture] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/profile").then(({ profile: data }) => {
      setProfile(data);
      setValues({ fullName: data.fullName || "", bio: data.bio || "", skills: (data.skills || []).join(", "), experience: data.experience || "", education: data.education || "", portfolioUrl: data.portfolioUrl || "", linkedinUrl: data.linkedinUrl || "", githubUrl: data.githubUrl || "" });
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);
  function update(event) { setValues({ ...values, [event.target.name]: event.target.value }); }
  async function save(event) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      const result = await api("/profile", { method: "PATCH", body: jsonBody({ ...values, skills: values.skills.split(",").map((skill) => skill.trim()).filter(Boolean) }) });
      setProfile(result.profile); setSuccess("Profile saved.");
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  async function uploadPicture(event) {
    event.preventDefault();
    if (!picture) return;
    const form = new FormData(); form.set("profilePicture", picture);
    setError(""); setSuccess(""); setBusy(true);
    try { const result = await api("/profile/picture", { method: "POST", body: form }); setProfile(result.profile); setPicture(null); setSuccess("Profile picture updated."); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  async function removePicture() {
    setError(""); setSuccess("");
    try { const result = await api("/profile/picture", { method: "DELETE" }); setProfile(result.profile); setSuccess("Profile picture removed."); }
    catch (requestError) { setError(requestError.message); }
  }
  if (loading) return <Loading />;
  return <>
    <PageTitle eyebrow="Your presence" title="Profile" description="Help people understand your experience and what you bring to a project." />
    <Alert error={error} success={success} />
    <div className="profile-layout"><aside className="profile-photo-card">
      <div className="profile-picture">{profile?.profilePicture ? <img src={profile.profilePicture} alt="Profile" /> : <span>{values.fullName?.slice(0, 1).toUpperCase() || "G"}</span>}</div>
      <h2>{values.fullName || "Your name"}</h2><p>JPG, PNG, GIF or WEBP · max 2 MB</p>
      <form className="picture-form" onSubmit={uploadPicture}><input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => setPicture(event.target.files?.[0] || null)} /><button className="button button-outline small" disabled={!picture || busy}>Upload picture</button></form>
      {profile?.profilePicture && <button className="text-button" onClick={removePicture}>Remove picture</button>}
    </aside>
    <form className="editor-card form-stack profile-form" onSubmit={save}>
      <FormField label="Full name"><input name="fullName" value={values.fullName} onChange={update} /></FormField>
      <FormField label="About you"><textarea name="bio" rows="5" value={values.bio} onChange={update} placeholder="Share a little about your background and what you enjoy working on." /></FormField>
      <FormField label="Skills (comma separated)"><input name="skills" value={values.skills} onChange={update} placeholder="Design, React, writing" /></FormField>
      <FormField label="Experience"><textarea name="experience" rows="4" value={values.experience} onChange={update} /></FormField>
      <FormField label="Education"><textarea name="education" rows="3" value={values.education} onChange={update} /></FormField>
      <FormField label="Portfolio URL"><input name="portfolioUrl" type="url" value={values.portfolioUrl} onChange={update} placeholder="https://" /></FormField>
      <div className="form-row"><FormField label="LinkedIn URL"><input name="linkedinUrl" type="url" value={values.linkedinUrl} onChange={update} placeholder="https://" /></FormField><FormField label="GitHub URL"><input name="githubUrl" type="url" value={values.githubUrl} onChange={update} placeholder="https://" /></FormField></div>
      <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
    </form></div>
  </>;
}

function Conversations() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/messages/conversations").then(({ conversations }) => setItems(conversations)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }, []);
  return <>
    <PageTitle eyebrow="Stay in touch" title="Messages" description="Continue conversations with the people you work with." />
    <Alert error={error} />
    {loading ? <Loading /> : items.length ? <div className="conversation-list">{items.map((item) => <Link className="conversation-row" to={`/messages/${item.user._id}`} key={item.user._id}><span className="conversation-avatar">{item.user.username.slice(0, 1).toUpperCase()}</span><span className="conversation-main"><strong>{item.user.username}</strong><small>{item.message}</small></span><span className="conversation-meta"><span className="role-label">{item.user.role}</span><small>{formatDate(item.createdAt)}</small></span><b>→</b></Link>)}</div> : <EmptyState title="No conversations yet" detail="When you message another member, the conversation will show up here." />}
  </>;
}

function Conversation() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [other, setOther] = useState(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const result = await api(`/messages/${userId}`);
      setOther(result.user); setMessages(result.messages); setError("");
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [userId]);
  async function send(event) {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true); setError("");
    try {
      await api(`/messages/${userId}`, { method: "POST", body: jsonBody({ message: value }) });
      setValue("");
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  if (loading) return <Loading />;
  return <section className="chat-card">
    <div className="chat-header"><Link to="/messages">← All messages</Link><div><span className="conversation-avatar">{other?.username?.slice(0, 1).toUpperCase()}</span><div><strong>{other?.username || "Conversation"}</strong><small>{other?.role}</small></div></div></div>
    <Alert error={error} />
    <div className="chat-messages">{messages.length ? messages.map((message) => <div className={`message-bubble ${String(message.sender) === String(currentUser._id) ? "message-own" : ""}`} key={message._id}><p>{message.message}</p><small>{new Date(message.createdAt).toLocaleString()}</small></div>) : <p className="empty-chat">Start the conversation with {other?.username}.</p>}</div>
    <form className="chat-compose" onSubmit={send}><input aria-label="Message" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Write a message…" maxLength="5000" /><button className="button button-primary" disabled={busy || !value.trim()}>{busy ? "Sending…" : "Send"}</button></form>
  </section>;
}

function App() {
  return <SiteLayout>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/jobs" element={<BrowseJobs />} />
      <Route path="/jobs/:id" element={<JobDetails />} />
      <Route path="/dashboard/developer" element={<Protected role="developer"><Dashboard /></Protected>} />
      <Route path="/dashboard/freelancer" element={<Protected role="freelancer"><Dashboard /></Protected>} />
      <Route path="/jobs/new" element={<Protected role="developer"><PostJob /></Protected>} />
      <Route path="/my-jobs" element={<Protected role="developer"><MyJobs /></Protected>} />
      <Route path="/my-jobs/:id/edit" element={<Protected role="developer"><PostJob edit /></Protected>} />
      <Route path="/applications" element={<Protected role="developer"><ApplicationsReceived /></Protected>} />
      <Route path="/my-applications" element={<Protected role="freelancer"><MyApplications /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/messages" element={<Protected><Conversations /></Protected>} />
      <Route path="/messages/:userId" element={<Protected><Conversation /></Protected>} />
      <Route path="*" element={<EmptyState title="Page not found" detail="The page you’re looking for doesn’t exist." action={<Link className="button button-primary" to="/">Return home</Link>} />} />
    </Routes>
  </SiteLayout>;
}

export default App;
