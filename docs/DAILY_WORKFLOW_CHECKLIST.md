# Daily Workflow Checklist

**Purpose**: Answer "What do I do RIGHT NOW?" at any moment during development
**Pattern Prevention**: Addresses Pattern #1 (Methodology Abandonment) and Pattern #3 (Reactive Crisis Loop)
**Usage**: Reference this EVERY DAY to stay on track

---

## 📋 Quick Navigation

- [Morning Startup (5 min)](#morning-startup-5-min)
- [Before Starting Work (3 min)](#before-starting-work-3-min)
- [During Work (Continuous)](#during-work-continuous)
- [End of Day (5 min)](#end-of-day-5-min)
- [Weekly Review (15 min)](#weekly-review-15-min)
- [Emergency Procedures](#emergency-procedures)

---

## 🌅 Morning Startup (5 min)

**Time**: First 5 minutes of your workday

### Checklist

```
□ Open terminal, navigate to project
  cd /Users/seman/Desktop/zmartV0.69

□ Pull latest from main
  git checkout main
  git pull origin main

□ Check your current branch
  git branch --show-current

□ Review yesterday's progress in TODO_CHECKLIST.md
  - What did I complete?
  - What's blocked?
  - What's next?

□ Check IMPLEMENTATION_PHASES.md for current week
  - Am I on track?
  - Any dependencies I need to handle?

□ Review MICRO_TASK_BREAKDOWN.md for today's micro-tasks
  - What are my 3-5 micro-tasks for today?
  - Which template do I need? (Anchor/Backend/Frontend)

□ Check if any PRs pending review
  gh pr list

□ Quick standup (if team):
  - What I did yesterday
  - What I'm doing today
  - Any blockers
```

**Output**: Clear picture of today's work

---

## 🎯 Before Starting Work (3 min)

**Time**: Before implementing EACH new story or feature

### Checklist

```
□ Identify current phase and week
  - Check TODO_CHECKLIST.md progress bars
  - Confirm I'm working on the right phase

□ Select today's work from MICRO_TASK_BREAKDOWN.md
  - Pick 1 major task OR 3-5 micro-tasks
  - Ensure dependencies are met

□ Check if story file exists
  - If YES: Review story file (docs/stories/STORY-X.Y.md)
  - If NO: Create from template first!

  cp docs/stories/STORY-TEMPLATE.md docs/stories/STORY-X.Y.md
  # Fill out BEFORE coding

□ Determine Definition of Done tier
  - Tier 1: Critical infrastructure (full testing)
  - Tier 2: Standard features (standard testing)
  - Tier 3: Minor features (basic testing)
  - Tier 4: Documentation/config (no testing)

  See: docs/DEFINITION_OF_DONE.md

□ Create feature branch (if not exists)
  git checkout -b feature/story-X-Y-description

□ Select implementation template
  - Anchor instruction? → docs/implementation-templates/anchor-instruction-template.md
  - Backend service? → docs/implementation-templates/backend-service-template.md
  - Frontend component? → docs/implementation-templates/frontend-component-template.md
  - Testing? → docs/implementation-templates/testing-template.md

□ Open template side-by-side with your editor
  - Template in one window
  - Code in another
  - Follow template steps sequentially
```

**Output**: Ready to start work with clear template

---

## ⚙️ During Work (Continuous)

**Time**: Throughout your work session

### The Implementation Loop

**Repeat this cycle every 30-60 minutes**:

```
1. [ ] Check current step in implementation template
   - Am I on the right step?
   - Have I completed previous step?

2. [ ] Implement ONE micro-step (30-60 min max)
   - Focus on ONE thing
   - Don't jump ahead
   - Follow template exactly

3. [ ] Test immediately after each micro-step
   - Anchor: anchor test (relevant test file)
   - Backend: npm test (specific test)
   - Frontend: npm run dev (manual check)

4. [ ] Commit if micro-step complete
   git add .
   git commit -m "feat: Story X.Y - [micro-step description]"

   ✅ Git hook validates story reference

5. [ ] Update progress
   - Check off micro-task in MICRO_TASK_BREAKDOWN.md
   - Update story file with notes
   - Push if end of session:
     git push origin feature/story-X-Y

6. [ ] Take 5-minute break
   - Stretch
   - Water
   - Review next micro-step
```

### Continuous Questions (Ask yourself every 30 min)

```
□ Am I following the template? (Yes/No)
  If NO → Return to template, identify current step

□ Am I blocked? (Yes/No)
  If YES → See RECOVERY_PROCEDURES.md immediately

□ Have I tested the last change? (Yes/No)
  If NO → Stop, test NOW

□ Have I committed in last hour? (Yes/No)
  If NO → Commit now (even if incomplete)

□ Is this taking longer than expected? (Yes/No)
  If YES → Break into smaller micro-steps

□ Am I deviating from the plan? (Yes/No)
  If YES → Return to IMPLEMENTATION_PHASES.md
```

### Red Flags 🚨

**STOP IMMEDIATELY if**:
- ❌ You've been on same micro-step for >90 minutes
- ❌ You haven't committed in >2 hours
- ❌ Tests are failing and you keep coding
- ❌ You're implementing something not in story file
- ❌ You can't explain what you're doing

**Action**: See [Emergency Procedures](#emergency-procedures)

---

## 🌙 End of Day (5 min)

**Time**: Last 5 minutes of workday

### Checklist

```
□ Save all work (commit everything)
  git add .
  git commit -m "feat: Story X.Y - WIP: [where you are]"
  git push origin feature/story-X-Y

□ Update MICRO_TASK_BREAKDOWN.md
  - Check off completed micro-tasks
  - Note any blockers
  - Plan tomorrow's work

□ Update story file (docs/stories/STORY-X.Y.md)
  - Add implementation notes
  - Document challenges encountered
  - Record time spent

□ Update TODO_CHECKLIST.md if task complete
  - Change [ ] to [x] for completed tasks
  - Update status (🔴 → 🟡 → ✅)

□ Review tomorrow's plan
  - What's the first micro-task?
  - Any dependencies to handle?
  - Any help needed?

□ Close all terminals/editors cleanly
  - No orphaned processes
  - No unsaved files

□ Quick retrospective (30 seconds)
  - What went well today?
  - What slowed me down?
  - What will I do differently tomorrow?
```

**Output**: Clean state, ready for tomorrow

---

## 📅 Weekly Review (15 min)

**Time**: Friday afternoon or Monday morning

### Checklist

```
□ Review week's progress in TODO_CHECKLIST.md
  - How many tasks completed?
  - Am I on schedule per IMPLEMENTATION_PHASES.md?
  - Any slippage? (Acceptable 10-20%)

□ Update progress bars in TODO_CHECKLIST.md
  Phase 1: ███░░░░░░░  X% (Y/Z)
  Phase 2: ░░░░░░░░░░   X% (Y/Z)
  ...

□ Review completed stories
  - All marked COMPLETED?
  - All PRs merged?
  - All branches deleted?

□ Identify blockers for next week
  - Dependencies not met?
  - Technical debt accumulating?
  - Need external help?

□ Check circuit breakers (see CI/CD)
  - Failures in last week?
  - Patterns emerging?
  - Need to adjust DoD tier?

□ Update IMPLEMENTATION_PHASES.md if needed
  - Adjust timeline if behind
  - Note learnings
  - Update estimates

□ Plan next week's micro-tasks
  - Review MICRO_TASK_BREAKDOWN.md
  - Select 15-25 micro-tasks for next week
  - Ensure templates ready

□ Celebrate wins 🎉
  - What went well?
  - What am I proud of?
  - Share progress with team/community
```

**Output**: Clear plan for next week

---

## 🚨 Emergency Procedures

**When things go wrong**

### Scenario 1: Build Failing

```
1. STOP coding immediately
2. Read error message carefully
3. Check RECOVERY_PROCEDURES.md → "Build Failures"
4. Follow troubleshooting steps
5. If still stuck after 30 min → Ask for help
6. Document solution in story file
```

### Scenario 2: Tests Failing

```
1. STOP adding features
2. Run tests again to confirm: anchor test OR npm test
3. Check RECOVERY_PROCEDURES.md → "Test Failures"
4. Fix ONE test at a time
5. Commit after each fix
6. If pattern of failures → Review implementation template
```

### Scenario 3: Stuck on Micro-Step >90 Minutes

```
1. STOP and take 10-minute break
2. Re-read template step carefully
3. Check if dependencies met
4. Break micro-step into smaller steps (15-30 min each)
5. Ask for help in community/team
6. If truly blocked → Mark task as BLOCKED in TODO_CHECKLIST.md
7. Move to different task (don't waste time)
```

### Scenario 4: Lost Track of What I'm Doing

```
1. STOP everything
2. Open story file: docs/stories/STORY-X.Y.md
3. Re-read "Overview" and "Acceptance Criteria"
4. Check implementation template for current step
5. Look at last commit message: git log -1
6. Resume from last completed micro-step
7. Update story file with clarifications
```

### Scenario 5: Methodology Abandonment (Pattern #1)

**Signs**:
- Haven't updated story file in 2+ days
- Committing without story references
- Skipping templates
- Not following DEVELOPMENT_WORKFLOW.md

**Recovery**:
```
1. STOP and acknowledge deviation
2. Review CLAUDE.md (main entry point)
3. Return to last completed story
4. Create story file if missing
5. Recommit to process (git hook will enforce)
6. Ask team/community for accountability partner
```

---

## 📚 Related Documents

**Daily Reference**:
- [MICRO_TASK_BREAKDOWN.md](./MICRO_TASK_BREAKDOWN.md) - Today's micro-tasks
- [Implementation Templates](./implementation-templates/) - Step-by-step guides
- [RECOVERY_PROCEDURES.md](./RECOVERY_PROCEDURES.md) - When blocked

**Weekly Reference**:
- [IMPLEMENTATION_PHASES.md](../IMPLEMENTATION_PHASES.md) - Current week's plan
- [TODO_CHECKLIST.md](./TODO_CHECKLIST.md) - Overall progress

**As-Needed Reference**:
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) - Git workflow
- [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) - Quality tiers
- [VERIFICATION_SUMMARY.md](./VERIFICATION_SUMMARY.md) - Mechanics reference

---

## 🎯 Success Metrics

**Daily**:
- ✅ Completed 3-5 micro-tasks
- ✅ Committed at least 3 times
- ✅ No micro-step took >90 minutes
- ✅ Updated story file and MICRO_TASK_BREAKDOWN.md

**Weekly**:
- ✅ Completed 15-25 micro-tasks
- ✅ 1-2 stories COMPLETED and merged
- ✅ No deviations from methodology
- ✅ Progress matches IMPLEMENTATION_PHASES.md (±10%)

**Monthly**:
- ✅ Phase X complete or >80% done
- ✅ No accumulated technical debt
- ✅ All tests passing
- ✅ On track for 20-week timeline

---

## 💡 Pro Tips

1. **Start small**: First week, just follow morning/end-of-day checklists
2. **Build habit**: Use this doc for 21 days, it becomes automatic
3. **Customize**: Add your own checks if needed (but don't remove existing)
4. **Print it**: Keep a printed copy visible
5. **Use alarms**: Set 30-min timer for micro-step completion
6. **Celebrate small wins**: Check off micro-tasks gives dopamine hits
7. **Don't skip steps**: Every step exists to prevent Pattern #1/#3

---

**Last Updated**: November 5, 2025
**Version**: 1.0
**Status**: ✅ READY FOR DAILY USE

---

**Remember**: This document prevents:
- ❌ "What do I do now?" paralysis
- ❌ Working for hours without progress
- ❌ Methodology abandonment
- ❌ Reactive crisis loops

**Your job**: Follow it religiously for first 21 days. Then it's automatic. 🚀
